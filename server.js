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



// Ruta para obtener alumnos de UN profesor específico
// Ruta para obtener los alumnos de un profesor específico
app.get('/api/alumnos/:profesorId', (req, res) => {
    const { profesorId } = req.params;
    const sql = "SELECT id, nombre, apellido, email, edad, estado, fecha_alta FROM alumnos WHERE profesor_id = ?";
    
    db.query(sql, [profesorId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al obtener alumnos");
        }
        res.json(results); // Enviamos la lista de alumnos al frontend
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




app.get('/api/estadisticas/:profesorId', (req, res) => {
    const { profesorId } = req.params;
    const sql = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) as activos,
            SUM(CASE WHEN estado = 0 THEN 1 ELSE 0 END) as inactivos
        FROM alumnos WHERE profesor_id = ?`;

    db.query(sql, [profesorId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});



app.post('/api/alumnos', (req, res) => {
    // 1. Extraemos los datos del body (image_865545.png confirmaba que faltaba password)
    const { nombre, apellido, email, password, edad, profesor_id } = req.body;

    // 2. Cambiamos 'activo' por el número 1 para evitar el error de la imagen 86595d.png
    const sql = "INSERT INTO alumnos (nombre, apellido, email, password, edad, fecha_alta, estado, profesor_id) VALUES (?, ?, ?, ?, ?, CURDATE(), 1, ?)";

    db.query(sql, [nombre, apellido, email, password, edad, profesor_id], (err, result) => {
        if (err) {
            console.error("Error en MySQL:", err); // Esto te mostrará si hay otro detalle
            return res.status(500).send(err);
        }
        res.json({ mensaje: "Alumno registrado con éxito", id: result.insertId });
    });
});


app.delete('/api/alumnos/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM alumnos WHERE id = ?";

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al eliminar de la base de datos");
        }
        res.status(200).send({ message: "Alumno eliminado con éxito" });
    });
});





app.put('/api/alumnos/estado/:id', (req, res) => {
    const { id } = req.params;
    const { nuevoEstado } = req.body; // Esto recibe el 0 o 1

    const sql = "UPDATE alumnos SET estado = ? WHERE id = ?";
    
    db.query(sql, [nuevoEstado, id], (err, result) => {
        if (err) {
            console.error("Error en DB:", err);
            return res.status(500).send(err);
        }
        // Si el cambio fue exitoso, avisamos al frontend
        res.status(200).send({ message: "Estado actualizado con éxito" });
    });
});



app.get('/api/stats/:profesorId', (req, res) => {
    const { profesorId } = req.params;
    
    const sqlAl = "SELECT COUNT(*) as total FROM alumnos WHERE profesor_id = ? AND (estado = 1 OR estado = 'activo')";
    const sqlRu = "SELECT COUNT(*) as total FROM rutinas WHERE profesor_id = ?";
    const sqlOk = "SELECT COUNT(*) as total FROM cuotas WHERE profesor_id = ? AND estado = 'pagado'";
    const sqlVe = "SELECT COUNT(*) as total FROM cuotas WHERE profesor_id = ? AND estado = 'pendiente' AND fecha_vencimiento < CURDATE()";

    db.query(sqlAl, [profesorId], (err, resAl) => {
        db.query(sqlRu, [profesorId], (err, resRu) => {
            db.query(sqlOk, [profesorId], (err, resOk) => {
                db.query(sqlVe, [profesorId], (err, resVe) => {
                    
                    // Validamos cada resultado antes de mandarlo para evitar el error de image_85e468.png
                    res.json({
                        socios: (resAl && resAl[0]) ? resAl[0].total : 0,
                        rutinas: (resRu && resRu[0]) ? resRu[0].total : 0,
                        cuotas: (resOk && resOk[0]) ? resOk[0].total : 0,
                        vencidas: (resVe && resVe[0]) ? resVe[0].total : 0
                    });
                });
            });
        });
    });
});




// 1. Listar solo los que tengan rol de profesor o administrador
app.get('/api/profesores-lista', (req, res) => {
    const sql = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.edad, COUNT(a.id) as total_alumnos 
        FROM usuarios u 
        LEFT JOIN alumnos a ON u.id = a.profesor_id 
        GROUP BY u.id`;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. Registrar con el campo ROL
app.post('/api/registrar-profesor', (req, res) => {
    // Extraemos todos los datos, incluida la edad
    const { nombre, apellido, email, password, edad } = req.body;

    // Usamos el rol 'profesor' por defecto
    const sql = "INSERT INTO usuarios (nombre, apellido, email, password, rol, edad) VALUES (?, ?, ?, ?, 'profesor', ?)";

    db.query(sql, [nombre, apellido, email, password, edad], (err, result) => {
        if (err) {
            console.error("Error en MySQL:", err); // Esto imprimirá el error real en tu consola
            return res.status(500).json({ error: err.message });
        }
        res.json({ mensaje: "Profesor registrado con éxito" });
    });
});




app.delete('/api/eliminar-profesor/:id', (req, res) => {
    const { id } = req.params;
    console.log("Intentando eliminar ID:", id); // Mirá tu terminal de VS Code

    const sql = "DELETE FROM usuarios WHERE id = ?"; 
    // Quitamos temporalmente el 'AND rol = profesor' para probar

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error en MySQL:", err);
            return res.status(500).send(err);
        }
        
        if (result.affectedRows === 0) {
            console.log("No se encontró ningún registro con ese ID");
            return res.status(404).json({ mensaje: "No se encontró el profesor" });
        }

        console.log("Registro eliminado correctamente");
        res.json({ mensaje: "Profesor eliminado correctamente" });
    });
});





app.listen(3000, () => console.log('🚀 Servidor en http://localhost:3000'));