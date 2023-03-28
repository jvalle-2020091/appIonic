const validate = require('../utils/validate');
const jwt = require("../middlewares/jwt");
const moment = require("moment");
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const fs = require('fs');
const path = require('path');
const User = require("../models/User.model");
const User_Rol = require("../models/User_Rol.model");
const Device = require("../models/Device.model");
const Role_Functions = require("../models/Role_Functions.model");
const Function = require("../models/Functions.model");
const { QueryTypes } = require('sequelize');
const sequelize = require("../bin/sequelize");
const { Op } = require('sequelize');
const CryptoJS = require("crypto-js");


// ADMIN
exports.register = async (req, res) => {
    try {
        const params = req.body;

        const tempPassword = uuidv4().substring(0, 8);
        let data = {
            username: params.username,
            firstName: params.firstName,
            lastName: params.lastName,
            mail: params.mail,
            password: await validate.encrypt(tempPassword),
            activated: false,
            loginAttemps: 0,
            isLocked: false,
            lockUntil: 0,
            deleted: false,
            needChangePassword: true
        }
        const msg = validate.validateData(data);
        if (msg) return res.status(400).send(msg);

        data.username = data.username.toUpperCase();
        data.mail = data.mail.toLowerCase();

        const userName = await User.findOne({
            where: {
                username: data.username
            }
        });
        const mail = await User.findOne({
            where: {
                mail: data.mail
            }
        });

        const validateEmail = p => p.search(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

        if (validateEmail(data.mail)) return res.status(400).send({ message: res.i18n.t('register_400') });

        if (userName && mail && mail.deleted == false) {
            return res.status(400).send({ message: res.i18n.t('register_401') });
        }
        if (userName) return res.status(400).send({ message: res.i18n.t('register_402') });
        if (mail && mail.deleted == false) return res.status(400).send({ message: res.i18n.t('register_403') });
        data.image = "";
        data.resetPasswordToken = "";
        data.activateUserToken = "";
        data.sessionUserToken = "";

        //Asignar al menos un rol
        const idsRol = params.idsRol;
        if (idsRol == undefined || idsRol.length == 0) return res.status(400).send({ message: res.i18n.t('register_404') });

        const user = await User.create(data);

        //Agregarle al usuario los roles que desee
        for (let i = 0; i < idsRol.length; i++) {
            let data = {
                UserId: user.id,
                RolId: idsRol[i]
            }
            let user_rol = await User_Rol.create(data);
        };

        let emailSend = (/true/i).test(params.sendEmail);
        if (emailSend) this.sendCredentials(user, tempPassword);
        if (req.files.image) {
            const alreadyImage = await User.findOne({
                where: {
                    id: user.id
                }
            });
            let pathFile = './views/users/';
            if (alreadyImage.image) fs.unlinkSync(pathFile + alreadyImage.image);

            //ruta en la que llega la imagen
            const filePath = req.files.image.path; // \uploads\users\file_name.ext

            //separar en jerarquía la ruta de la imágen (linux o MAC: ('\'))
            const fileSplit = filePath.split('\\');// fileSplit = ['uploads', 'users', 'file_name.ext']
            const fileName = fileSplit[2];// fileName = file_name.ext

            const extension = fileName.split('\.'); // extension = ['file_name', 'ext']
            const fileExt = extension[1]; // fileExt = ext;

            const validExt = await validate.validExtension(fileExt, filePath);

            if (validExt === false) {
                return res.status(400).send({ message: res.i18n.t('register_405') });
            } else {
                const userUpdate = await User.update({
                    image: fileName
                }
                    , {
                        where: {
                            id: user.id
                        }
                    });
                if (!userUpdate) return res.status(400).send({ message: res.i18n.t('register_406') });
                console.log("Image created.");
            }
        }
        const newUser = await User.findOne({
            where: {
                id: user.id
            }
        });

        return res.send({ message: res.i18n.t('register_200'), newUser });
    } catch (error) {
        console.log(error);
        return error;
    }
}

//Funcion para obtener la imagen de un usuario.
exports.getImage = async (req, res) => {
    try {
        const fileName = req.params.fileName;
        const pathFile = './views/users/' + fileName;

        const image = fs.existsSync(pathFile);
        if (!image) {
            return res.status(404).send({ message: 'Image not found' });
        } else {
            return res.sendFile(path.resolve(pathFile));
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send({ message: 'Error getting image' });
    }
}

//ENVIAR CREDENCIALES POR CORREO
exports.sendCredentials = async (user, tempPassword) => {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            auth: {
                user: process.env.USERMAIL,
                pass: process.env.PASSMAIL
            }
        });

        let mail_options = {
            from: process.env.FROM_MAIL,
            to: user.mail,
            subject: `Bienvenido `,
            html: 'Hola' + ' ' + user.firstName + ' ' + user.lastName + ', ' + 'gusto en saludarte,' +
                ' <br>' +
                ' <br>' + '• Usuario:' + ' ' + user.username +
                ' <br>' + '• Tu contraseña temporal es:' + ' ' + tempPassword +
                ' <br>' +
                ' <br>' + 'Saludos Cordiales,'
        };

        transporter.sendMail(mail_options, (error, info) => {
            if (error) console.log(error);
            console.log('El correo se envío correctamente ' + info.response);
        });
    } catch (error) {
        console.log(error);
        return error;
    }
}

exports.login = async (req, res) => {
    try {
        const params = req.body;
        let data = {
            username: params.username,
            password: params.password
        }
        const msg = validate.validateData(data);
        if (msg) return res.status(400).send(msg);

        data.username.toLowerCase();
        const usernameExist = await User.findOne({
            where: {
                username: data.username
            }
        });
        if (!usernameExist) return res.status(400).send({ message: "Invalid credentials" });
        if (usernameExist.deleted) return res.status(400).send({ message: "Invalid credentials" });

        //SI LA CUENTA ESTÁ BLOQUEADA
        if (usernameExist.isLocked) {
            // PRUEBA LOCKED
            if (usernameExist.lockUntil == 0) return res.status(400).send({ message: "Your account has been blocked by an administrator." });
            if (moment().unix() < usernameExist.lockUntil) return res.status(400).send({ message: "Your account is still locked." });

            let lockedUpdated = await User.update({
                isLocked: false,
                lockUntil: 0,
                loginAttemps: 0
            }, {
                where: {
                    id: usernameExist.id
                }
            });
            const newUserSearch = await User.findOne({
                where: {
                    username: data.username
                }
            });
            //SI LOS PARAMETROS SON CORRECTOS
            if (await validate.checkPassword(params.password, newUserSearch.password)) {
                //SE CREA EL TOKEN
                let token = await jwt.createToken(newUserSearch);
                //ACTUALIZAR EL LOGIN ATTEPMT A 0 e ingresar el token
                const attempsUpdated = await User.update({
                    loginAttemps: 0,
                    sessionUserToken: token
                }, {
                    where: {
                        id: newUserSearch.id
                    }
                });
                return res.status(200).send({ message: "Logged In", token, newUserSearch });
            }
            //SI LOS PARAMETROS SON INCORRECTOS
            if (newUserSearch.loginAttemps < parseInt(process.env.ATTEMPTS)) {
                let loginAttemps = newUserSearch.loginAttemps;
                const attempsUpdated = await User.update({
                    loginAttemps: loginAttemps + 1
                }, {
                    where: {
                        id: newUserSearch.id
                    }
                });
                return res.status(400).send({ message: `Invalid credentials. Remaining attempts: ${3 - (newUserSearch.loginAttemps + 1)}` });
            }
            const locked = await User.update({
                isLocked: true,
                lockUntil: moment().unix() + parseInt(process.env.TIMELOCKED)
            }, {
                where: {
                    id: newUserSearch.id
                }
            });
            return res.status(400).send({ message: `Your account has been locked for ${((parseInt(process.env.TIMELOCKED)) / 60).toFixed(2)} min.` });
        }

        //SI LA CUENTA "NO" ESTÁ BLOQUEADA
        if (await validate.checkPassword(params.password, usernameExist.password)) {
            //SE CREA EL TOKEN
            const token = await jwt.createToken(usernameExist);
            //ACTUALIZAR EL LOGIN ATTEPMT A 0 e ingresar el token
            const attempsUpdated = await User.update({
                loginAttemps: 0,
                sessionUserToken: token
            }, {
                where: {
                    id: usernameExist.id
                }
            });
            return res.status(200).send({ message: "Logged In", token, usernameExist });
        }
        //SI AUN NO HA TERMINADO SUS INTENTOS
        if (usernameExist.loginAttemps < parseInt(process.env.ATTEMPTS)) {
            let loginAttemps = usernameExist.loginAttemps;
            const attempsUpdated = await User.update({
                loginAttemps: loginAttemps + 1
            }, {
                where: {
                    id: usernameExist.id
                }
            });
            return res.status(400).send({ message: `Invalid credentials. Remaining attempts: ${3 - (usernameExist.loginAttemps + 1)}` });
        }
        //SI YA TERMINÓ SUS INTENTOS
        const locked = await User.update({
            isLocked: true,
            lockUntil: moment().unix() + parseInt(process.env.TIMELOCKED)
        }, {
            where: {
                id: usernameExist.id
            }
        });
        return res.status(400).send({ message: `Your account has been locked for ${((parseInt(process.env.TIMELOCKED)) / 60).toFixed(2)} min.` });

    } catch (error) {
        console.log(error);
        return error;
    }
}

//Actualizar Contraseña cuando se logea por primera vez
exports.updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword, idUser } = req.body;
        //Función para verificar si una contraseña es segura.
        const isStrongPassword = p => p.search(/^((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=\S+$)(?=.*[;:\.,!¡\?¿@#\$%\^&\-_+=\(\)\[\]\{\}])).{8,20}$/) != -1;

        const data = {
            newPassword,
            confirmPassword
        }

        const updateUserSearch = await User.findOne({
            where: {
                id: idUser
            }
        });

        const msg = validate.validateData(data);
        if (msg) return res.status(400).send(msg);
        if (!updateUserSearch.needChangePassword) return res.status(400).send({ message: "User has not requested a password change." });
        if (!(await validate.checkPassword(oldPassword, updateUserSearch.password))) return res.status(400).send({ message: "Invalid old password." });
        if (!isStrongPassword(newPassword)) return res.status(400).send({ message: "The password does not meet the requirements." });
        if (newPassword != confirmPassword) return res.status(400).send({ message: "There is no match between the passwords." });

        // Se actualiza la contraseña del ususario
        const userUpdated = await User.update({
            password: await validate.encrypt(newPassword),
            needChangePassword: false
        }, {
            where: {
                id: idUser
            }
        });

        return res.status(200).send({ message: "Password updated." });
    } catch (error) {
        console.log(error);
        return error;
    }
}

// Actualizar contraseña cuando el usuario solicita un cambio de contraseña (ADMIN)
exports.updatePasswordByAdmin = async (req, res) => {
    try {
        const idUser = req.params.idUser;
        const tempPassword = uuidv4().substring(0, 8);
        const user = await User.findOne({
            where: {
                id: idUser
            }
        });
        const userUpdate = await User.update({
            password: await validate.encrypt(tempPassword),
            needChangePassword: true
        }, {
            where: {
                id: idUser
            }
        });
        this.sendCredentials(user, tempPassword);
        return res.status(200).send({ message: res.i18n.t('update_password_200') });
    } catch (error) {
        console.log(error);
        return error;
    }
}

//Listar Usuarios
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: {
                deleted: false
            }
        });

        return res.status(200).send({ users })
    } catch (error) {
        console.log(error);
        return error;
    }
};

//Listar un usuario
exports.getUser = async (req, res) => {
    try {
        const idUser = req.params.idUser;
        const user = await User.findOne({
            where: {
                id: idUser
            }
        });
        return res.status(200).send({ user })

    } catch (error) {
        console.log(error);
        return error;
    }
}

//Eliminar Usuario (nivel lógico)
exports.deleteUser = async (req, res) => {
    try {
        const idUser = req.params.idUser;
        const userExist = await User.findOne({
            where: {
                id: idUser
            }
        });
        if (!userExist) return res.status(400).send({ message: res.i18n.t('delete_400') });

        const userUpdate = await User.update({
            deleted: true
        }, {
            where: {
                id: idUser
            }
        })

        const deletedUser_Rol = await User_Rol.destroy({
            where: {
                UserId: [idUser]
            }
        });

        return res.status(200).send({ message: res.i18n.t('delete_200') });
    } catch (error) {
        console.log(error);
        return error;
    }
};

//Actualizar Usuario
exports.updateUser = async (req, res) => {
    try {
        const idUser = req.params.idUser;
        const params = req.body

        const userExist = await User.findOne({
            where: {
                id: idUser
            }
        });
        if (!userExist) return res.status(400).send({ message: res.i18n.t('update_400') });
        //No se permite actualizar el username
        const userUpdate = await User.update(
            params
            , {
                where: {
                    id: idUser
                }
            });

        return res.status(200).send({ message: res.i18n.t('update_200') });
    } catch (error) {
        console.log(error);
        return error;
    }
};

exports.permissions_id = async (req, res) => {
    try {
        const idUser = req.params.id;
        const idFunctions = [];

        const functionsSeq = await sequelize.query(`SELECT DISTINCT RF.FunctionId FROM user_rols UR inner join role_functions RF on UR.RolId = RF.RolId where UR.UserId = ${idUser};`, { type: QueryTypes.SELECT });
        for (var i in functionsSeq) {
            idFunctions.push(functionsSeq[i].FunctionId);
        }
        return res.status(200).send({ idFunctions });
    } catch (err) {
        return err;
    }
}

// ------ DEVICES ------

// Registrar dispositivos
exports.registerDevice = async (req, res) => {
    try {
        const params = req.body;
        let data = {
            UserId: params.UserId,
            uuid: params.uuid,
            name: params.name,
            biometric: params.biometric
        }
        const msg = validate.validateData(data);
        if (msg) return res.status(400).send(msg);

        const existDevice = await Device.findOne({
            where: {
                uuid: data.uuid,
                UserId: { [Op.ne]: data.UserId }
            }
        });

        if (existDevice) return res.status(400).send({ message: 'The device is already assigned to a user' })

        const idDevice = await Device.findOne({
            where: {
                uuid: data.uuid,
                UserId: { [Op.eq]: data.UserId }
            }
        });

        let device;
        if (idDevice) {
            device = await Device.update({
                biometric: params.biometric
            }, {
                where: {
                    uuid: data.uuid,
                    UserId: { [Op.eq]: data.UserId }
                }
            });
        } else {
            device = await Device.create(data);
        }
        return res.send({ message: 'Device register', device });

    } catch (error) {
        console.log(error);
        return error;
    }
}

// Ver dispositivo
exports.getDevice = async (req, res) => {
    try {
        const uuid = req.params.uuid;
        let device = null;

        // const [device] = await sequelize.query(`
        // select d.*, u.username 
        // from devices d 
        // inner join users u on d.UserId = u.id 
        // where d.uuid = '${uuid}'`);
        
        const _device = await User.findOne({
            include: {
                model: Device, required: true,
                where: {
                    uuid: uuid
                }
            },
        });

        if(_device != null){
            device = {
                uuid: _device.Devices[0].uuid,
                name: _device.Devices[0].name,
                UserId: _device.Devices[0].UserId,
                biometric: _device.Devices[0].biometric,
                username: _device.username,
            }
        }
        return res.status(200).send({ device })
    } catch (error) {
        console.log(error);
        return error;
    }
}

// Ver dispositivos de cada usuario
exports.getDevices = async (req, res) => {
    try {
        const userId = req.params.UserId;
        const device = await Device.findAll({
            where: {
                userId: userId
            }
        });
        return res.status(200).send({ device })
    } catch (error) {
        console.log(error);
        return error;
    }
}

// Realizar login con biometría
exports.loginBiometric = async (req, res) => {
    try {
        const { btp, uuid } = req.body;

        const device = await Device.findOne({
            where: {
                uuid: uuid
            }
        });

        const user = await User.findOne({
            where: {
                id: device.UserId
            }
        });
        const bptBackend = CryptoJS.SHA256(uuid + user.userName).toString(CryptoJS.enc.Hex);
        if (btp != bptBackend) return res.status(400).send({ message: "Device not exists" });
        if (user.deleted) return res.status(400).send({ message: "ACCOUNT DELETED" });
        if (user.locked)
            if (user.lockUntil == 0)
                return res.status(400).send({ message: "Your account has been blocked by an administrator." });
        const token = await jwt.createToken(user);

        return res.status(200).send({ message: "Logged In", token, user });
    } catch (error) {
        console.log(error);
        return error;
    }
}

//Actualizar dispositivo o registrar si no existe
exports.updateDevice = async (req, res) => {
    try {
        const uuid = req.params.uuid;
        const params = req.body

        let data = {
            UserId: params.UserId,
            uuid: req.params.uuid,
            name: params.name,
            biometric: params.biometric
        }

        let device = await Device.findOne({
            where: {
                uuid: uuid
            }
        });

        if (!device) {
            device = await Device.create(data);
            return res.status(200).send({ device });
        }

        await Device.update(
            params
            , {
                where: {
                    uuid: uuid
                }
            });
        device = await Device.findOne({
            where: {
                uuid: uuid
            }
        });
        return res.status(200).send({ device });

    } catch (error) {
        console.log(error);
        return error;
    }
}

// Eliminar dispositivo
exports.deleteDevice = async (req, res) => {
    try {
        const userId = req.user.id;
        const uuid = req.params.uuid;

        const device = await Device.findOne({
            where: {
                uuid: uuid
            }
        });
        if (device.UserId != userId) return res.send({ message: 'This device does not belong to you' })

        Device.destroy({
            where: {
                uuid: uuid
            }
        });
        return res.status(200).send({ message: 'Device deleted sucessfully' });

    } catch (err) {
        console.log(err);
        return err;
    }

}

