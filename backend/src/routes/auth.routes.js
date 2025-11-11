const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

router.post('/login', authCtrl.login);
router.post('/register', authenticate, authorizeRoles('admin'), authCtrl.register);

module.exports = router;
