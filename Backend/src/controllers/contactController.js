const { sendContactEmail } = require("../services/emailService");

exports.submitContactForm = async (req, res, next) => {
  try {
    const { email, message } = req.body;
    
    if (!email || !message) {
      return res.status(400).json({ success: false, message: "Email and message are required" });
    }

    await sendContactEmail(email, message);
    
    res.status(200).json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    next(error);
  }
};
