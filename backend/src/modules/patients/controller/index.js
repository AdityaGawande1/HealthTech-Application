import { patientService } from '../service/index.js';
import { validatePatient, validatePatientUpdate } from '../validation/index.js';
import { AppError } from '../../../middleware/errorHandler.js';

export const getAllPatients = async (req, res, next) => {
  try {
    const patients = await patientService.findAll(req.query.search);
    res.json({ success: true, data: patients, message: 'Patients loaded', errors: [] });
  } catch (err) {
    next(err);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientService.findById(req.params.id);
    if (!patient) throw new AppError('Patient not found', 404);
    res.json({ success: true, data: patient, message: 'Patient loaded', errors: [] });
  } catch (err) {
    next(err);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const patient = await patientService.create(validatePatient(req.body));
    res.status(201).json({ success: true, data: patient, message: 'Patient created', errors: [] });
  } catch (err) {
    next(err);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const patient = await patientService.update(req.params.id, validatePatientUpdate(req.body));
    res.json({ success: true, data: patient, message: 'Patient updated', errors: [] });
  } catch (err) {
    next(err);
  }
};

export const deletePatient = async (req, res, next) => {
  try {
    await patientService.delete(req.params.id);
    res.json({ success: true, data: null, message: 'Patient deleted', errors: [] });
  } catch (err) {
    next(err);
  }
};
