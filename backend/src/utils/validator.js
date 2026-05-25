const { ValidationError } = require('./errors');

const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      for (const rule of rules) {
        switch (rule.type) {
          case 'required':
            if (value === undefined || value === null || value === '') {
              errors.push({ field, message: `${field} is required` });
            }
            break;
          case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push({ field, message: `${field} must be a valid email` });
            }
            break;
          case 'phone':
            if (value && !/^\d{10,15}$/.test(value.replace(/\D/g, ''))) {
              errors.push({ field, message: `${field} must be a valid phone number` });
            }
            break;
          case 'minLength':
            if (value && String(value).length < rule.value) {
              errors.push({ field, message: `${field} must be at least ${rule.value} characters` });
            }
            break;
          case 'maxLength':
            if (value && String(value).length > rule.value) {
              errors.push({ field, message: `${field} must be at most ${rule.value} characters` });
            }
            break;
          case 'min':
            if (value !== undefined && value !== null && Number(value) < rule.value) {
              errors.push({ field, message: `${field} must be at least ${rule.value}` });
            }
            break;
          case 'max':
            if (value !== undefined && value !== null && Number(value) > rule.value) {
              errors.push({ field, message: `${field} must be at most ${rule.value}` });
            }
            break;
          case 'enum':
            if (value && !rule.value.includes(value)) {
              errors.push({ field, message: `${field} must be one of: ${rule.value.join(', ')}` });
            }
            break;
          case 'date':
            if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              errors.push({ field, message: `${field} must be a valid date (YYYY-MM-DD)` });
            }
            break;
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
    next();
  };
};

const patientSchema = {
  name: [{ type: 'required' }, { type: 'minLength', value: 2 }, { type: 'maxLength', value: 255 }],
  phone: [{ type: 'required' }, { type: 'phone' }],
  age: [{ type: 'min', value: 0 }, { type: 'max', value: 150 }],
  email: [{ type: 'email' }],
  gender: [{ type: 'enum', value: ['Male', 'Female', 'Other'] }],
};

const appointmentSchema = {
  patient_id: [{ type: 'required' }],
  doctor_id: [{ type: 'required' }],
  scheduled_date: [{ type: 'required' }, { type: 'date' }],
  scheduled_time: [{ type: 'required' }],
};

const loginSchema = {
  username: [{ type: 'required' }],
  password: [{ type: 'required' }],
};

module.exports = { validate, patientSchema, appointmentSchema, loginSchema };