const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Esto permite que el servidor muestre el HTML

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'naruto22', 
    database: 'programagym'
});

db.connect(err => {
    if (err) throw err;
    console.log('✅ Conectado a MySQL');
});

// RUTA PARA REGISTRAR ALUMNOS
// Agregá esto en tu server.js (debajo de donde declarás las rutas)
app.post('/registro', (req, res) => {
    const { nombre, email, password, rol } = req.body;
    
    // Cambiá "usuarios" por el nombre exacto de tu tabla si es distinto
    const sql = "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [nombre, email, password, rol], (err, result) => {
        if (err) {
            console.error("Error al insertar:", err);
            return res.status(500).json({ message: "Error al guardar en la base de datos" });
        }
        res.status(201).json({ message: "Usuario registrado con éxito" });
    });
});




// OBTENER TODOS LOS USUARIOS
app.get('/usuarios', (req, res) => {
    db.query('SELECT * FROM usuarios', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// BORRAR UN ALUMNO
app.delete('/eliminar-usuario/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM usuarios WHERE id = ?";
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error en la base de datos");
        }
        res.send("Usuario eliminado");
    });
});

app.post('/asignar-rutina', (req, res) => {
    const { id_alumno, descripcion } = req.body;
    // Usamos el campo dia_semana como opcional por ahora
    const sql = 'INSERT INTO rutinas (id_alumno, descripcion) VALUES (?, ?)';
    
    db.query(sql, [id_alumno, descripcion], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('Rutina guardada');
    });
});




// RUTA PARA OBTENER RUTINAS DE UN ALUMNO ESPECÍFICO
app.get('/rutinas/:id', (req, res) => {
    const id = req.params.id;
    // IMPORTANTE: Agregar 'id' a la consulta SQL
    db.query('SELECT id, descripcion FROM rutinas WHERE id_alumno = ?', [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});




// --- RUTA ÚNICA DE LOGIN ---
app.post('/login-general', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ success: false, message: "Usuario no encontrado" });
        }

        const usuario = results[0];

        try {
            // 1. Intentamos comparar con Bcrypt (por si ya está encriptada)
            const coincidenBcrypt = await bcrypt.compare(password, usuario.password);
            
            // 2. O comparamos con texto plano (para tus datos actuales como "1234")
            const coincidenPlano = (password === usuario.password);

            if (coincidenBcrypt || coincidenPlano) {
                res.json({
                    success: true,
                    id: usuario.id,
                    nombre: usuario.nombre,
                    rol: usuario.rol
                });
            } else {
                res.status(401).json({ success: false, message: "Contraseña incorrecta" });
            }
        } catch (error) {
            // Si bcrypt falla porque el dato no es un hash, cae acá y probamos plano
            if (password === usuario.password) {
                return res.json({ success: true, id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
            }
            res.status(401).json({ success: false, message: "Error de validación" });
        }
    });
});




const bcrypt = require('bcrypt');

app.post('/registrar', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    
    // Encriptamos la contraseña (10 es el nivel de seguridad)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sql = 'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)';
    db.query(sql, [nombre, email, hashedPassword, rol], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('Alumno registrado con éxito');
    });
});





app.delete('/borrar-rutina/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM rutinas WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send("Rutina eliminada");
    });
});



app.listen(3000, () => console.log('🚀 Servidor en http://localhost:3000'));