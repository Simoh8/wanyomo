import emailjs from '@emailjs/browser';

// Initialize EmailJS with environment variables
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

if (PUBLIC_KEY) {
  emailjs.init(PUBLIC_KEY);
}

/**
 * Send an invitation email to a team member
 * @param {string} toEmail - The recipient's email address
 * @param {string} inviterName - The name of the person sending the invite
 * @param {string} inviterEmail - The email of the person sending the invite
 * @param {string} role - The role being assigned (Attendant, Manager, Owner)
 * @param {string} appName - The name of the application
 * @returns {Promise} - EmailJS send promise
 */
export const sendInviteEmail = async (toEmail, inviterName, inviterEmail, role, appName = 'Shamba Books') => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new Error('EmailJS is not configured. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in your .env file.');
  }

  const templateParams = {
    to_email: toEmail,
    to_name: toEmail.split('@')[0],
    from_name: inviterName,
    from_email: inviterEmail,
    role: role,
    app_name: appName,
    invite_link: window.location.href,
  };

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
    return response;
  } catch (error) {
    console.error('EmailJS error:', error);
    throw new Error(`Failed to send email: ${error.text || error.message}`);
  }
};
