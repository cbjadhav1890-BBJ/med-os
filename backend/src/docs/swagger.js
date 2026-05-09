const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MedOS HMS API',
      version: '2.0.0',
      description: 'Hospital Management System REST API',
      contact: { name: 'MedOS Support', email: 'support@medos.com' },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Patient: {
          type: 'object',
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string', example: 'John Doe' },
            age: { type: 'integer', example: 35 },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
            phone: { type: 'string', example: '9876543210' },
            email: { type: 'string', format: 'email' },
            address: { type: 'string' },
            city: { type: 'string' },
            blood_group: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
            allergies: { type: 'string' },
            abha_id: { type: 'string' },
            emergency_contact_name: { type: 'string' },
            emergency_contact_phone: { type: 'string' },
            insurance_provider: { type: 'string' },
            insurance_policy_no: { type: 'string' },
            dpdp_consent: { type: 'boolean', default: false },
          },
        },
        Appointment: {
          type: 'object',
          required: ['patient_id', 'doctor_id', 'scheduled_date', 'scheduled_time'],
          properties: {
            patient_id: { type: 'string', format: 'uuid' },
            doctor_id: { type: 'string', format: 'uuid' },
            department_id: { type: 'string', format: 'uuid' },
            scheduled_date: { type: 'string', format: 'date', example: '2024-01-15' },
            scheduled_time: { type: 'string', example: '10:00' },
            appointment_type: { type: 'string', enum: ['New', 'Follow-up', 'Emergency'], default: 'New' },
            chief_complaint: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/docs/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;