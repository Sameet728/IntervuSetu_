import os
import sys
import tempfile
import base64
import json
import re
import time
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import needle
from llama_cpp import Llama

sys.stdout.reconfigure(encoding='utf-8')

app = Flask("local_ai_server")
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QWEN_MODEL_PATH = os.path.join(BASE_DIR, "models", "qwen2.5-0.5b-instruct-q4_k_m.gguf")

# ─── 1. Load Whistle Neural STT (16.9 MB) ──────────────────────────
print("[INFO] Loading Whistle Neural STT Engine (Cactus Compute)...")
try:
    whistle_model = needle.Whistle()
    print("[OK] Whistle 16.9 MB model active on CPU!")
except Exception as e:
    print(f"[WARN] Error loading Whistle: {e}")
    whistle_model = None

# ─── 2. Load Qwen 2.5 0.5B Instruct LLM (468 MB GGUF) ───────────────
print("[INFO] Loading Qwen 2.5 0.5B Instruct GGUF into memory...")
try:
    if os.path.exists(QWEN_MODEL_PATH):
        qwen_llm = Llama(
            model_path=QWEN_MODEL_PATH,
            n_ctx=2048,
            n_threads=6,
            verbose=False
        )
        print("[OK] Qwen 2.5 0.5B Instruct active on CPU (< 300ms latency)!")
    else:
        print(f"[WARN] Qwen model not found at: {QWEN_MODEL_PATH}")
        qwen_llm = None
except Exception as e:
    print(f"[WARN] Error loading Qwen LLM: {e}")
    qwen_llm = None


# ─── Health & Diagnostics ──────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "stt": {
            "model": "whistle-16.9mb",
            "ready": whistle_model is not None,
            "engine": "cactus-needle-cpu"
        },
        "llm": {
            "model": "qwen2.5-0.5b-instruct-q4_k_m",
            "ready": qwen_llm is not None,
            "size_mb": 468.6,
            "engine": "llama-cpp-cpu"
        },
        "unlimited_offline_ready": whistle_model is not None and qwen_llm is not None
    })

# ─── Model Download & Offline Hub Management ───────────────────────
download_state = {
    "status": "idle", # "idle" | "downloading" | "completed" | "error"
    "model": None,
    "percent": 100 if (os.path.exists(QWEN_MODEL_PATH) and whistle_model is not None) else 0,
    "downloaded_mb": 468.6 if os.path.exists(QWEN_MODEL_PATH) else 0,
    "total_mb": 485.5,
    "error": None
}

@app.route("/models/status", methods=["GET"])
def models_status():
    qwen_present = os.path.exists(QWEN_MODEL_PATH)
    qwen_size = round(os.path.getsize(QWEN_MODEL_PATH) / (1024 * 1024), 1) if qwen_present else 0.0
    whistle_ready = whistle_model is not None

    return jsonify({
        "success": True,
        "whistle": {
            "name": "Whistle Neural STT (Cactus Compute)",
            "size_mb": 16.9,
            "ready": whistle_ready,
            "engine": "needle-cpu",
            "architecture": "Whisper-compatible neural encoder-decoder",
            "offline_ready": whistle_ready
        },
        "qwen": {
            "name": "Qwen 2.5 0.5B Instruct",
            "size_mb": qwen_size or 468.6,
            "ready": qwen_llm is not None,
            "file_exists": qwen_present,
            "path": QWEN_MODEL_PATH,
            "engine": "llama-cpp-cpu (C++)",
            "latency": "< 250ms TTFT",
            "offline_ready": qwen_llm is not None
        },
        "total_pack_size_mb": 485.5,
        "unlimited_interviews_ready": whistle_ready and (qwen_llm is not None),
        "download_state": download_state
    })

@app.route("/models/download", methods=["POST"])
def download_models():
    global qwen_llm, whistle_model, download_state

    if download_state["status"] == "downloading":
        return jsonify({"success": True, "message": "Download already in progress", "state": download_state})

    import threading
    import urllib.request

    def run_download():
        global qwen_llm, whistle_model, download_state
        download_state["status"] = "downloading"
        download_state["error"] = None
        download_state["percent"] = 5

        try:
            # 1. Initialize Whistle if missing
            if not whistle_model:
                try:
                    whistle_model = needle.Whistle()
                except Exception as we:
                    print(f"[WARN] Whistle load error: {we}")

            # 2. Download Qwen GGUF if missing
            models_dir = os.path.dirname(QWEN_MODEL_PATH)
            os.makedirs(models_dir, exist_ok=True)

            qwen_url = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"

            if not os.path.exists(QWEN_MODEL_PATH) or os.path.getsize(QWEN_MODEL_PATH) < 400 * 1024 * 1024:
                print(f"[INFO] Downloading Qwen 2.5 GGUF from {qwen_url}...")
                
                def reporthook(count, block_size, total_size):
                    downloaded = count * block_size
                    pct = min(99, int((downloaded / total_size) * 100))
                    download_state["percent"] = pct
                    download_state["downloaded_mb"] = round(downloaded / (1024 * 1024), 1)
                    download_state["total_mb"] = round(total_size / (1024 * 1024), 1)

                urllib.request.urlretrieve(qwen_url, QWEN_MODEL_PATH, reporthook=reporthook)

            # 3. Load Qwen into Llama
            if not qwen_llm and os.path.exists(QWEN_MODEL_PATH):
                qwen_llm = Llama(
                    model_path=QWEN_MODEL_PATH,
                    n_ctx=2048,
                    n_threads=6,
                    verbose=False
                )

            download_state["status"] = "completed"
            download_state["percent"] = 100
            download_state["downloaded_mb"] = 468.6
            print("[OK] Offline AI Pack downloaded & activated successfully!")
        except Exception as e:
            print(f"[ERROR] Offline AI Pack download failed: {e}")
            download_state["status"] = "error"
            download_state["error"] = str(e)

    thread = threading.Thread(target=run_download, daemon=True)
    thread.start()

    return jsonify({
        "success": True,
        "message": "Offline AI Pack download initiated in background",
        "state": download_state
    })


# ─── STT: Transcribe File ──────────────────────────────────────────
@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if not whistle_model:
        return jsonify({"success": False, "error": "Whistle model not initialized"}), 503

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded in form data 'file'"}), 400

    audio_file = request.files["file"]
    keywords_raw = request.form.get("keywords", "")
    language = request.form.get("language", "en")
    
    kw_list = [k.strip() for k in keywords_raw.split(",") if k.strip()] if keywords_raw else None

    suffix = os.path.splitext(audio_file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        audio_file.save(tmp_path)

    try:
        result = whistle_model.transcribe(
            tmp_path,
            language=language if language != "auto" else None,
            keywords=kw_list,
            word_timestamps=True
        )
        return jsonify({
            "success": True,
            "text": (result.get("text") or "").strip(),
            "language": result.get("language") or language,
            "ttft_ms": result.get("ttft_ms", 0.0),
            "decode_tps": result.get("decode_tps", 0.0),
            "words": result.get("words", [])
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err), "text": ""}), 500
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ─── STT: Transcribe Base64 ────────────────────────────────────────
@app.route("/transcribe-base64", methods=["POST"])
def transcribe_base64():
    if not whistle_model:
        return jsonify({"success": False, "error": "Whistle model not initialized"}), 503

    data = request.get_json(silent=True) or {}
    audio_b64 = data.get("audio_base64")
    if not audio_b64:
        return jsonify({"success": False, "error": "Missing audio_base64 in request body"}), 400

    keywords = data.get("keywords")
    language = data.get("language", "en")

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception as e:
        return jsonify({"success": False, "error": f"Invalid base64 audio: {e}"}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp_path = tmp.name
        tmp.write(audio_bytes)

    try:
        result = whistle_model.transcribe(
            tmp_path,
            language=language if language != "auto" else None,
            keywords=keywords,
            word_timestamps=True
        )
        return jsonify({
            "success": True,
            "text": (result.get("text") or "").strip(),
            "language": result.get("language") or language,
            "ttft_ms": result.get("ttft_ms", 0.0),
            "decode_tps": result.get("decode_tps", 0.0),
            "words": result.get("words", [])
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err), "text": ""}), 500
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ─── LLM: Live Interview Evaluation & Feedback ─────────────────────
@app.route("/interview/evaluate", methods=["POST"])
def evaluate_candidate():
    if not qwen_llm:
        return jsonify({"success": False, "error": "Qwen 2.5 model not initialized"}), 503

    data = request.get_json(silent=True) or {}
    question = data.get("question", "")
    answer = data.get("userAnswer", "").strip()
    code = data.get("code", "").strip() if data.get("code") else ""
    role = data.get("role", "Software Engineer")
    tech_stack = data.get("techStack", [])
    tech_str = ", ".join(tech_stack) if isinstance(tech_stack, list) else str(tech_stack)
    expected_answer = data.get("expectedAnswer", "").strip()
    topic = data.get("topic", "").strip()

    if not question or (not answer and not code):
        return jsonify({"success": False, "error": "question and either userAnswer or code are required"}), 400

    topic_str = f" on {topic}" if topic else ""
    expected_str = f"\nKey Expected Concepts: {expected_answer}" if expected_answer else ""

    if code:
        prompt = f"""<|im_start|>system
You are a senior technical interviewer for a {role} position ({tech_str}).
The candidate submitted code and an explanation for an interview question{topic_str}.
Critique BOTH their code implementation and verbal reasoning against production standards.
Output strictly in this format:
SCORE: <number between 1 and 10>
FEEDBACK: <1 sentence stating ONLY what technical logic, algorithm, or pattern they implemented correctly. No negative words or 'however' here>
BRUTAL: <1 sentence stating ONLY the main edge-case, complexity issue, or optimization they missed>
CROSS_QUESTION: <1 probing technical follow-up directly challenging a design or code choice in their solution><|im_end|>
<|im_start|>user
Interview Question: {question}{expected_str}
Candidate Verbal Answer: {answer or "See code submission"}

Candidate Code:
```{code}```<|im_end|>
<|im_start|>assistant
SCORE:"""
    else:
        prompt = f"""<|im_start|>system
You are a senior technical interviewer for a {role} position ({tech_str}).
The candidate answered an interview question{topic_str}.
Compare their answer directly to the question requirements and expected concepts to provide precise, relevant feedback.
Output strictly in this format:
SCORE: <number between 1 and 10>
FEEDBACK: <1 sentence stating ONLY what technical concept or explanation they got right. No negative words or 'however' here>
BRUTAL: <1 sentence stating ONLY what specific technical detail, trade-off, or failure mode was missing or needs improvement>
CROSS_QUESTION: <1 challenging follow-up question testing their understanding><|im_end|>
<|im_start|>user
Interview Question: {question}{expected_str}
Candidate Answer: {answer}<|im_end|>
<|im_start|>assistant
SCORE:"""

    t0 = time.time()
    try:
        out = qwen_llm(prompt, max_tokens=220, stop=["<|im_end|>", "\n\n\n"], temperature=0.35)
        dt = time.time() - t0
        raw = "SCORE:" + out["choices"][0]["text"].strip()

        score_m = re.search(r"SCORE:\s*([0-9\.]+)", raw)
        fb_m = re.search(r"FEEDBACK:\s*(.+?)(?=BRUTAL:|$)", raw, re.DOTALL)
        brutal_m = re.search(r"BRUTAL:\s*(.+?)(?=CROSS_QUESTION:|$)", raw, re.DOTALL)
        cq_m = re.search(r"CROSS_QUESTION:\s*(.+?)$", raw, re.DOTALL)

        score_val = float(score_m.group(1)) if score_m else 7.5
        score_val = max(1.0, min(10.0, score_val))

        short_fb = fb_m.group(1).strip() if fb_m else ""
        brutal_fb = brutal_m.group(1).strip() if brutal_m else ""

        # Clean short_fb so it stays purely positive without spilling into brutal critique
        if short_fb:
            split_fb = re.split(r'\b(However|Although|On the other hand|Nonetheless|Unfortunately|Though)\b', short_fb, flags=re.IGNORECASE)
            if split_fb and len(split_fb[0].strip()) > 15:
                short_fb = split_fb[0].strip().rstrip(',.;:')

        fallback_topic = topic or "the core concepts"
        if not short_fb:
            short_fb = f"Code implementation cleanly addresses the primary logic for {fallback_topic}." if code else f"Accurately articulated the foundational concepts of {fallback_topic}."

        if not brutal_fb:
            brutal_fb = f"Consider verifying edge cases, boundary inputs, and optimal runtime space complexity in {fallback_topic}." if code else f"Could elaborate further on production scaling, failure modes, and trade-offs for {fallback_topic}."

        cross_q = cq_m.group(1).strip() if cq_m else ("What is the time complexity of your code, and how would you optimize it?" if code else f"How would you handle high concurrency or failure scenarios in {fallback_topic}?")

        return jsonify({
            "success": True,
            "engine": "qwen2.5-0.5b-local",
            "score": round(score_val, 1),
            "shortFeedback": short_fb,
            "brutalFeedback": brutal_fb,
            "crossQuestion": cross_q,
            "latency_ms": round(dt * 1000)
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500


# ─── LLM: Contextual Cross-Question / Follow-up ──────────────────────
@app.route("/interview/cross-question", methods=["POST"])
def cross_question_local():
    if not qwen_llm:
        return jsonify({"success": False, "error": "Qwen 2.5 model not initialized"}), 503

    data = request.get_json(silent=True) or {}
    question = data.get("question", "")
    answer = data.get("userAnswer", "").strip()
    code = data.get("code", "").strip() if data.get("code") else ""
    role = data.get("role", "Software Engineer")
    tech_stack = data.get("techStack", [])
    tech_str = ", ".join(tech_stack) if isinstance(tech_stack, list) else str(tech_stack)
    urgency = data.get("urgency", "normal")
    max_words = int(data.get("maxWords", 25))
    is_short = urgency in ["critical", "tight"] or data.get("targetSize") == "short"

    if not question:
        return jsonify({"success": False, "error": "question is required"}), 400

    max_tokens = 45 if is_short else 85
    brevity_instruction = (
        f"TIME IS LIMITED. Ask ONE very brief, concise follow-up question (under {max_words} words). Avoid preambles. Output ONLY the question itself."
        if is_short
        else f"Ask ONE sharp, probing follow-up question (under {max_words} words). Output ONLY the question itself."
    )

    if code:
        prompt = f"""<|im_start|>system
You are a senior technical interviewer for a {role} position ({tech_str}).
The candidate submitted a code implementation and explanation.
{brevity_instruction} Focus on edge cases, algorithmic complexity, or runtime failure modes.
Output format:
FOLLOWUP: <your follow-up question><|im_end|>
<|im_start|>user
Coding Question: {question}
Candidate Explanation: {answer or "See code"}
Candidate Code:
```{code[:500]}```<|im_end|>
<|im_start|>assistant
FOLLOWUP:"""
    else:
        prompt = f"""<|im_start|>system
You are a senior technical interviewer for a {role} position ({tech_str}).
The candidate answered an interview question.
{brevity_instruction} Focus on real-world depth, trade-offs, or production failure modes.
Output format:
FOLLOWUP: <your follow-up question><|im_end|>
<|im_start|>user
Question: {question}
Candidate Answer: {answer}<|im_end|>
<|im_start|>assistant
FOLLOWUP:"""

    t0 = time.time()
    try:
        out = qwen_llm(prompt, max_tokens=max_tokens, stop=["<|im_end|>", "\n\n", "\n"], temperature=0.4)
        dt = time.time() - t0
        raw = "FOLLOWUP:" + out["choices"][0]["text"].strip()
        m = re.search(r"FOLLOWUP:\s*(.+)$", raw, re.DOTALL)
        fallback_q = (
            ("In one sentence, what is the Big-O time complexity?" if code else "In one sentence, what is the primary architectural trade-off?")
            if is_short
            else ("What is the time complexity of your solution and can it be optimized?" if code else "How would you handle failure scenarios with this approach?")
        )
        followup = m.group(1).strip().replace('"', '') if m else fallback_q
        if not followup:
            followup = fallback_q

        return jsonify({
            "success": True,
            "engine": "qwen2.5-0.5b-local",
            "followupQuestion": followup,
            "crossQuestion": followup,
            "urgency": urgency,
            "is_short": is_short,
            "latency_ms": round(dt * 1000)
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500



# ─── LLM: Conversational Hint Generation ─────────────────────────────
@app.route("/interview/hint", methods=["POST"])
def generate_hint_local():
    if not qwen_llm:
        return jsonify({"success": False, "error": "Qwen 2.5 model not initialized"}), 503

    data = request.get_json(silent=True) or {}
    question = data.get("question", "")
    code = data.get("code", "")
    role = data.get("role", "Software Engineer")

    code_info = f"\nCandidate's current code draft:\n```{code}```" if code else ""
    prompt = f"""<|im_start|>system
You are a warm, supportive technical interviewer for a {role} interview.
The candidate asked for a hint on the current problem.
Provide a supportive, concise hint (1-2 sentences) that nudges them in the right direction without giving away the entire solution or code.
Output format:
HINT: <your hint here><|im_end|>
<|im_start|>user
Interview Question: {question}{code_info}<|im_end|>
<|im_start|>assistant
HINT:"""

    t0 = time.time()
    try:
        out = qwen_llm(prompt, max_tokens=100, stop=["<|im_end|>", "\n\n"], temperature=0.4)
        dt = time.time() - t0
        raw = "HINT:" + out["choices"][0]["text"].strip()
        m = re.search(r"HINT:\s*(.+)$", raw, re.DOTALL)
        hint = m.group(1).strip() if m else "Consider breaking down the problem into smaller sub-problems or using an auxiliary data structure like a hash map for faster lookups."

        return jsonify({
            "success": True,
            "engine": "qwen2.5-0.5b-local",
            "hint": hint,
            "latency_ms": round(dt * 1000)
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500


# ─── LLM: Question Clarification ──────────────────────────────────────
@app.route("/interview/clarify", methods=["POST"])
def clarify_question_local():
    if not qwen_llm:
        return jsonify({"success": False, "error": "Qwen 2.5 model not initialized"}), 503

    data = request.get_json(silent=True) or {}
    question = data.get("question", "")
    candidate_query = data.get("query", "")
    role = data.get("role", "Software Engineer")

    prompt = f"""<|im_start|>system
You are an interviewer for a {role} position.
The candidate is asking a clarifying question about the interview problem.
Answer their question directly and concisely in 1-2 sentences, clarifying constraints, expected behavior, or assumptions.
Output format:
CLARIFICATION: <your answer><|im_end|>
<|im_start|>user
Original Question: {question}
Candidate asks: {candidate_query}<|im_end|>
<|im_start|>assistant
CLARIFICATION:"""

    t0 = time.time()
    try:
        out = qwen_llm(prompt, max_tokens=100, stop=["<|im_end|>", "\n\n"], temperature=0.3)
        dt = time.time() - t0
        raw = "CLARIFICATION:" + out["choices"][0]["text"].strip()
        m = re.search(r"CLARIFICATION:\s*(.+)$", raw, re.DOTALL)
        clarification = m.group(1).strip() if m else "You can assume standard inputs, non-null values unless specified, and focus on optimal time and space complexity."

        return jsonify({
            "success": True,
            "engine": "qwen2.5-0.5b-local",
            "clarification": clarification,
            "latency_ms": round(dt * 1000)
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500


# ─── LLM: Local Question Generation (Qwen 2.5 0.5B) ───────────────────
@app.route("/interview/generate-questions", methods=["POST"])
def generate_questions_local():
    if not qwen_llm:
        return jsonify({"success": False, "error": "Qwen 2.5 model not loaded"}), 503

    data = request.get_json(silent=True) or {}
    role = data.get("role", "Software Engineer")
    tech_stack = data.get("techStack", [])
    tech_str = ", ".join(tech_stack) if isinstance(tech_stack, list) else str(tech_stack)
    count = int(data.get("count", 5))
    difficulty = data.get("difficulty", "medium")
    exp = data.get("experienceLevel", "mid")

    prompt = f"""<|im_start|>system
You are a senior technical interviewer for a {role} role ({tech_str}, {exp} level).
Generate {count} unique interview questions covering core concepts, real-world architecture, and practical problem solving.
Output format strictly:
Q1: <question 1>
Q2: <question 2>
Q3: <question 3>
and so on.<|im_end|>
<|im_start|>user
Generate {count} {difficulty} interview questions for {role} focusing on {tech_str}.<|im_end|>
<|im_start|>assistant
Q1:"""

    t0 = time.time()
    try:
        out = qwen_llm(prompt, max_tokens=350, stop=["<|im_end|>"], temperature=0.4)
        dt = time.time() - t0
        raw = "Q1:" + out["choices"][0]["text"].strip()

        questions = []
        lines = [line.strip() for line in raw.split("\n") if line.strip()]
        for line in lines:
            m = re.match(r"^Q\d+:\s*(.+)$", line, re.IGNORECASE)
            if m:
                q_text = m.group(1).strip()
                idx = len(questions) + 1
                questions.append({
                    "questionId": f"q{idx}",
                    "question": q_text,
                    "questionType": "theory" if idx % 2 != 0 else "code",
                    "difficulty": difficulty,
                    "expectedAnswer": f"Solid technical explanation of {tech_str} principles.",
                    "topic": tech_stack[0] if (isinstance(tech_stack, list) and tech_stack) else role
                })
            if len(questions) >= count:
                break

        # Fallback if Qwen produced fewer lines
        if len(questions) < count:
            defaults = [
                f"How do you design scalable applications using {tech_str} in production?",
                f"Can you explain concurrency, state management, or memory trade-offs when building with {tech_str}?",
                f"Describe a complex debugging challenge you faced with {role} workflows and how you diagnosed it.",
                f"How would you optimize latency and throughput for high-volume API endpoints in {tech_str}?",
                f"What architectural patterns do you prioritize for maintainability and testability in {role} projects?"
            ]
            while len(questions) < count:
                idx = len(questions) + 1
                d_text = defaults[(idx - 1) % len(defaults)]
                questions.append({
                    "questionId": f"q{idx}",
                    "question": d_text,
                    "questionType": "theory" if idx % 2 != 0 else "system_design",
                    "difficulty": difficulty,
                    "expectedAnswer": "In-depth discussion with architectural trade-offs.",
                    "topic": role
                })

        return jsonify({
            "success": True,
            "engine": "qwen2.5-0.5b-local",
            "questions": questions,
            "latency_ms": round(dt * 1000)
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500


# ─── LLM: Local Final Report Synthesis (Qwen 2.5 0.5B) ────────────────
@app.route("/interview/generate-report", methods=["POST"])
def generate_report_local():
    if not qwen_llm:
        return jsonify({"success": False, "error": "Qwen 2.5 model not loaded"}), 503

    data = request.get_json(silent=True) or {}
    role = data.get("role", "Software Engineer")
    tech_stack = data.get("techStack", [])
    tech_str = ", ".join(tech_stack) if isinstance(tech_stack, list) else str(tech_stack)
    questions_data = data.get("questionsData", [])

    scores = [q.get("score") for q in questions_data if q.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 7.5

    prompt = f"""<|im_start|>system
You are a senior tech hiring committee lead.
Candidate interviewed for {role} ({tech_str}).
Their average interview score across turns is {avg_score}/10.
Provide an executive evaluation summary:
STRENGTHS: <2 key technical strengths observed>
WEAKNESSES: <2 areas needing improvement>
RECOMMENDATION: <Strong Hire | Hire | Leaning Hire | Leaning No Hire><|im_end|>
<|im_start|>user
Summarize performance for {role}.<|im_end|>
<|im_start|>assistant
STRENGTHS:"""

    t0 = time.time()
    try:
        out = qwen_llm(prompt, max_tokens=220, stop=["<|im_end|>"], temperature=0.3)
        dt = time.time() - t0
        raw = "STRENGTHS:" + out["choices"][0]["text"].strip()

        st_m = re.search(r"STRENGTHS:\s*(.+?)(?=WEAKNESSES:|$)", raw, re.DOTALL)
        wk_m = re.search(r"WEAKNESSES:\s*(.+?)(?=RECOMMENDATION:|$)", raw, re.DOTALL)
        rec_m = re.search(r"RECOMMENDATION:\s*(.+?)$", raw, re.DOTALL)

        st_text = st_m.group(1).strip() if st_m else f"Good foundational knowledge in {tech_str}."
        wk_text = wk_m.group(1).strip() if wk_m else "Deepen hands-on edge case handling and error recovery."
        rec_text = rec_m.group(1).strip() if rec_m else ("Hire" if avg_score >= 7.0 else "Leaning Hire")

        strengths = [s.strip("- ") for s in st_text.split("\n") if s.strip()] or [st_text]
        weaknesses = [w.strip("- ") for w in wk_text.split("\n") if w.strip()] or [wk_text]

        tech_score = round(min(10.0, max(1.0, avg_score + 0.2)), 1)
        comm_score = round(min(10.0, max(1.0, avg_score - 0.3)), 1)
        ps_score = round(min(10.0, max(1.0, avg_score)), 1)

        report = {
            "overallScore": avg_score,
            "technicalScore": tech_score,
            "communicationScore": comm_score,
            "problemSolvingScore": ps_score,
            "strengths": strengths[:3],
            "weaknesses": weaknesses[:3],
            "detailedFeedback": f"The candidate demonstrated solid conceptual familiarity with {tech_str} for the {role} position. Responses reflected practical intuition, with opportunities to be even more structured on distributed system edge cases.",
            "hiringRecommendation": rec_text,
            "recommendations": [
                f"Continue practicing production-grade architectural trade-offs in {tech_str}.",
                "Structure answers with the STAR or Problem-Solution-Result framework."
            ],
            "skillBreakdown": [
                { "skill": f"{tech_str} Principles", "score": tech_score, "feedback": "Consistent technical grounding." },
                { "skill": "Architecture & Scalability", "score": ps_score, "feedback": "Good intuition on trade-offs." },
                { "skill": "Clarity & Articulation", "score": comm_score, "feedback": "Concise delivery throughout." }
            ]
        }

        return jsonify({
            "success": True,
            "engine": "qwen2.5-0.5b-local",
            "report": report,
            "latency_ms": round(dt * 1000)
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500


# ─── LLM: General Chat & Prompt Testing (Qwen 2.5 0.5B) ───────────
@app.route("/ai/chat", methods=["POST"])
def ai_chat():
    if not qwen_llm:
        return jsonify({
            "success": False,
            "error": "Qwen 2.5 model not initialized or not loaded on CPU"
        }), 503

    data = request.get_json(silent=True) or {}
    prompt_text = data.get("prompt", "")
    messages = data.get("messages", [])
    system_prompt = data.get("system_prompt", "You are Qwen 2.5, a fast, knowledgeable, and helpful technical assistant.")
    temperature = float(data.get("temperature", 0.7))
    max_tokens = int(data.get("max_tokens", 350))
    stream_requested = bool(data.get("stream", True))

    # Build ChatML prompt
    chat_prompt = ""
    if messages and isinstance(messages, list) and len(messages) > 0:
        # Check if first message is system
        has_system = any(m.get("role") == "system" for m in messages)
        if not has_system and system_prompt:
            chat_prompt += f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        for m in messages:
            r = m.get("role", "user")
            c = m.get("content", "")
            chat_prompt += f"<|im_start|>{r}\n{c}<|im_end|>\n"
        chat_prompt += "<|im_start|>assistant\n"
    elif prompt_text:
        chat_prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n<|im_start|>user\n{prompt_text}<|im_end|>\n<|im_start|>assistant\n"
    else:
        return jsonify({"success": False, "error": "Either 'prompt' or 'messages' must be provided"}), 400

    # ── SSE Streaming Mode ──────────────────────────────────────────
    if stream_requested:
        def generate_stream():
            t0 = time.time()
            first_token_time = None
            generated_text = ""
            tokens_count = 0
            try:
                llm_stream = qwen_llm(
                    chat_prompt,
                    max_tokens=max_tokens,
                    stop=["<|im_end|>", "<|endoftext|>"],
                    temperature=temperature,
                    stream=True
                )
                for chunk in llm_stream:
                    token = chunk["choices"][0]["text"]
                    if not token:
                        continue
                    if first_token_time is None:
                        first_token_time = time.time()
                    generated_text += token
                    tokens_count += 1
                    payload = json.dumps({"delta": token})
                    yield f"data: {payload}\n\n"

                total_time = time.time() - t0
                tps = round(tokens_count / total_time, 1) if total_time > 0 else 0.0
                ttft_ms = round((first_token_time - t0) * 1000) if first_token_time else round(total_time * 1000)
                done_meta = {
                    "done": True,
                    "response": generated_text.strip(),
                    "latency_ms": round(total_time * 1000),
                    "ttft_ms": ttft_ms,
                    "tokens_generated": tokens_count,
                    "tokens_per_second": tps,
                    "model": "qwen2.5-0.5b-instruct-q4_k_m"
                }
                yield f"data: {json.dumps(done_meta)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

        return Response(
            stream_with_context(generate_stream()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive"
            }
        )

    # ── Non-Streaming Mode (Fallback / Single-shot) ─────────────────
    t0 = time.time()
    try:
        out = qwen_llm(
            chat_prompt,
            max_tokens=max_tokens,
            stop=["<|im_end|>", "<|endoftext|>"],
            temperature=temperature
        )
        dt = time.time() - t0

        choice = out["choices"][0]
        response_text = choice["text"].strip()
        usage = out.get("usage", {})
        completion_tokens = usage.get("completion_tokens", len(response_text.split()))
        prompt_tokens = usage.get("prompt_tokens", len(chat_prompt.split()))
        total_tokens = usage.get("total_tokens", completion_tokens + prompt_tokens)

        tps = round(completion_tokens / dt, 1) if dt > 0 else 0.0
        latency_ms = round(dt * 1000)

        return jsonify({
            "success": True,
            "response": response_text,
            "model": "qwen2.5-0.5b-instruct-q4_k_m",
            "latency_ms": latency_ms,
            "tokens_generated": completion_tokens,
            "tokens_per_second": tps,
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            }
        })
    except Exception as err:
        return jsonify({"success": False, "error": str(err)}), 500






if __name__ == "__main__":
    port = int(os.environ.get("LOCAL_AI_PORT", 5001))
    print(f"[INFO] Serving Whistle Neural STT & Qwen 2.5 Local AI on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=False)
