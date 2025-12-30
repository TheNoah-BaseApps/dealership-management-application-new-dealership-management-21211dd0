export async function sendEmail({ to, subject, body, from = 'noreply@dealership.com' }) {
  try {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Sending email:', { to, subject, from });
    
    // Mock implementation - replace with actual email service
    const emailData = {
      to,
      from,
      subject,
      body,
      sentAt: new Date().toISOString()
    };
    
    // For demo purposes, just log
    console.log('Email sent:', emailData);
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      ...emailData
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Dealership Management System',
    body: `
      <h1>Welcome ${user.name}!</h1>
      <p>Your account has been created successfully.</p>
      <p>Role: ${user.role}</p>
      <p>You can now log in and start using the system.</p>
    `
  });
}

export async function sendLeadAssignmentEmail(lead, assignee) {
  return sendEmail({
    to: assignee.email,
    subject: `New Lead Assigned: ${lead.contact_name}`,
    body: `
      <h1>New Lead Assignment</h1>
      <p>A new lead has been assigned to you:</p>
      <ul>
        <li><strong>Name:</strong> ${lead.contact_name}</li>
        <li><strong>Email:</strong> ${lead.contact_email || 'N/A'}</li>
        <li><strong>Phone:</strong> ${lead.contact_phone || 'N/A'}</li>
        <li><strong>Vehicle Interest:</strong> ${lead.vehicle_interested || 'N/A'}</li>
        <li><strong>Estimated Value:</strong> $${lead.estimated_value || 'N/A'}</li>
      </ul>
      <p>Follow-up date: ${lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : 'Not set'}</p>
    `
  });
}

export async function sendAppointmentReminderEmail(appointment, customer) {
  return sendEmail({
    to: customer.email,
    subject: 'Service Appointment Reminder',
    body: `
      <h1>Appointment Reminder</h1>
      <p>Dear ${customer.name},</p>
      <p>This is a reminder of your upcoming service appointment:</p>
      <ul>
        <li><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${new Date(appointment.appointment_date).toLocaleTimeString()}</li>
        <li><strong>Service Type:</strong> ${appointment.service_type}</li>
      </ul>
      <p>We look forward to seeing you!</p>
    `
  });
}

export async function sendSaleConfirmationEmail(sale, customer, vehicle) {
  return sendEmail({
    to: customer.email,
    subject: 'Sale Confirmation',
    body: `
      <h1>Congratulations on Your Purchase!</h1>
      <p>Dear ${customer.name},</p>
      <p>Thank you for your purchase. Here are the details:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${vehicle.year} ${vehicle.make} ${vehicle.model}</li>
        <li><strong>VIN:</strong> ${vehicle.vin}</li>
        <li><strong>Sale Price:</strong> $${sale.sale_price?.toFixed(2)}</li>
        <li><strong>Delivery Date:</strong> ${sale.delivery_date ? new Date(sale.delivery_date).toLocaleDateString() : 'TBD'}</li>
      </ul>
      <p>We'll contact you soon with next steps.</p>
    `
  });
}