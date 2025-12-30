export async function sendSMS({ to, message }) {
  try {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('Sending SMS:', { to, message });
    
    // Mock implementation - replace with actual SMS service
    const smsData = {
      to,
      message,
      sentAt: new Date().toISOString()
    };
    
    // For demo purposes, just log
    console.log('SMS sent:', smsData);
    
    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
      ...smsData
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function sendAppointmentReminderSMS(appointment, customer) {
  const date = new Date(appointment.appointment_date);
  const message = `Hi ${customer.name}, reminder: You have a ${appointment.service_type} appointment on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}. See you then!`;
  
  return sendSMS({
    to: customer.phone,
    message
  });
}

export async function sendLeadFollowUpSMS(lead) {
  const message = `Hi ${lead.contact_name}, this is a follow-up regarding your interest in ${lead.vehicle_interested || 'our vehicles'}. When would be a good time to discuss further?`;
  
  return sendSMS({
    to: lead.contact_phone,
    message
  });
}

export async function sendServiceCompletionSMS(repairOrder, customer) {
  const message = `Hi ${customer.name}, your vehicle service is complete and ready for pickup. Total: $${repairOrder.total_amount?.toFixed(2)}. Call us to schedule pickup.`;
  
  return sendSMS({
    to: customer.phone,
    message
  });
}