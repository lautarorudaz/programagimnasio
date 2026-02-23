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

    // 1. Buscamos primero en la tabla de PROFESORES (usuarios)
    const sqlProfesor = 'SELECT * FROM usuarios WHERE email = ?';
    
    db.query(sqlProfesor, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err });

        if (results.length > 0) {
            const usuario = results[0];
            // Verificamos contraseña (plana como tienes "1234" o bcrypt)
            if (password === usuario.password) {
                return res.json({
                    success: true,
                    id: usuario.id,
                    nombre: usuario.nombre,
                    rol: 'profesor',
                    redirect: '/indexprofesor.html'
                });
            } else {
                return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
            }
        }

        // 2. Si no lo encontró en profesores, buscamos en ALUMNNOS
        const sqlAlumno = 'SELECT * FROM alumnos WHERE email = ?';
        db.query(sqlAlumno, [email], (err, resultsAlumno) => {
            if (err) return res.status(500).json({ error: err });

            if (resultsAlumno.length > 0) {
                const alumno = resultsAlumno[0];
                if (password === alumno.password) {
                    return res.json({
                        success: true,
                        id: alumno.id,
                        nombre: alumno.nombre,
                        rol: 'alumno',
                        redirect: '/vistaalumno/indexalumno.html' // Ruta a tu carpeta
                    });
                } else {
                    return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
                }
            }

            // 3. Si no está en ninguna de las dos
            res.status(401).json({ success: false, message: "Usuario no encontrado" });
        });
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


app.get('/api/rutinas/:profesorId', (req, res) => {
    const id = req.params.profesorId;

    // Usamos LEFT JOIN para traer la fecha de la rutina más reciente si existe
    const query = `
        SELECT 
            a.id, 
            a.nombre, 
            a.apellido, 
            a.fecha_alta, 
            a.estado,
            MAX(r.fecha_creacion) AS ultima_rutina_fecha
        FROM alumnos a
        LEFT JOIN rutinas_header r ON a.id = r.alumno_id
        WHERE a.profesor_id = ?
        GROUP BY a.id
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error("Error SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});



app.post('/api/guardar-rutina', (req, res) => {
    // Recibimos profesor_id desde el frontend
    const { alumno_id, nombre_plan, profesor_id, ejercicios } = req.body;

    // AGREGAMOS profesor_id a la consulta SQL
    const sqlHeader = "INSERT INTO rutinas_header (alumno_id, nombre_plan, profesor_id) VALUES (?, ?, ?)";
    
    db.query(sqlHeader, [alumno_id, nombre_plan, profesor_id], (err, result) => {
        if (err) {
            console.error("Error al insertar header:", err);
            return res.status(500).json(err);
        }

        const nuevaRutinaId = result.insertId; 

        const queryEjercicios = 'INSERT INTO rutina_ejercicios (rutina_id, dia, nombre_ejercicio, series, repeticiones, observaciones) VALUES ?';

        const valoresEjercicios = ejercicios.map(ej => [
            nuevaRutinaId,
            ej.dia,    
            ej.nombre, 
            ej.series, 
            ej.reps,   
            ej.obs     
        ]);

        db.query(queryEjercicios, [valoresEjercicios], (errEj) => {
            if (errEj) {
                console.error("Error al insertar ejercicios:", errEj);
                return res.status(500).json(errEj);
            }
            res.json({ success: true, message: "Rutina guardada" });
        });
    });
});







app.get('/api/estadisticas/:profesorId', (req, res) => {
    const profeId = req.params.profesorId;
    console.log("Petición recibida para Profe ID:", profeId);

    // Esta consulta es infalible para contar ambas tablas
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM alumnos WHERE profesor_id = ?) AS totalSocios,
            (SELECT COUNT(*) FROM rutinas_header WHERE profesor_id = ?) AS totalRutinas
    `;

    db.query(sql, [profeId, profeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Log para ver en la terminal de VS Code qué sale de la base de datos
        console.log("Resultado SQL:", results[0]); 
        res.json(results[0]);
    });
});




// Obtener un ejercicio específico para editar
app.get('/api/ejercicio/:id', (req, res) => {
    const ejercicioId = req.params.id;
    const sql = `SELECT * FROM rutina_ejercicios WHERE id = ?`;

    db.query(sql, [ejercicioId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]); // Enviamos solo el objeto del ejercicio
    });
});



app.get('/api/obtener-rutina-detalle/:id', (req, res) => {
    const rutinaId = req.params.id; // Este es el ID de la rutina (plan)
    const sql = `
        SELECT id, nombre_ejercicio, series, repeticiones, observaciones, dia 
        FROM rutina_ejercicios 
        WHERE rutina_id = ?`;

    db.query(sql, [rutinaId], (err, results) => {
        if (err) {
            console.error("Error en DB:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});






// 2. RUTA PARA GUARDAR LOS CAMBIOS (Update en rutina_ejercicios)
// RUTA PARA ACTUALIZAR EL EJERCICIO (El "destino" que falta)
app.put('/api/actualizar-ejercicio/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, series, reps, obs } = req.body;

    // Ajusté los nombres de las columnas a como los tenés en el SELECT anterior
    const sql = `
        UPDATE rutina_ejercicios 
        SET nombre_ejercicio = ?, series = ?, repeticiones = ?, observaciones = ? 
        WHERE id = ?`;

    db.query(sql, [nombre, series, reps, obs, id], (err, result) => {
        if (err) {
            console.error("Error al actualizar en DB:", err);
            return res.status(500).json({ success: false, error: err });
        }
        res.json({ success: true, message: "Ejercicio actualizado correctamente" });
    });
});



// Obtener todos los planes (headers) de un alumno
app.get('/api/planes-alumno/:id', (req, res) => {
    const sql = `SELECT id, nombre_plan FROM rutinas_header WHERE alumno_id = ?`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Obtener ejercicios de un plan específico
app.get('/api/ejercicios-plan/:planId', (req, res) => {
    const sql = `SELECT * FROM rutina_ejercicios WHERE rutina_id = ?`;
    db.query(sql, [req.params.planId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});


// RUTA PARA ELIMINAR UN PLAN COMPLETO
app.delete('/api/eliminar-plan/:id', (req, res) => {
    const planId = req.params.id;

    // Primero borramos los ejercicios asociados a ese plan
    const sqlEjercicios = `DELETE FROM rutina_ejercicios WHERE rutina_id = ?`;
    
    db.query(sqlEjercicios, [planId], (err, result) => {
        if (err) return res.status(500).json({ error: "Error al borrar ejercicios" });

        // Una vez borrados los ejercicios, borramos el header del plan
        const sqlHeader = `DELETE FROM rutinas_header WHERE id = ?`;
        db.query(sqlHeader, [planId], (err, result) => {
            if (err) return res.status(500).json({ error: "Error al borrar el plan" });
            res.json({ message: "Plan eliminado correctamente" });
        });
    });
});


// A. Obtener los encabezados de las rutinas de un alumno
app.get('/api/rutinas-alumno/:idAlumno', (req, res) => {
    const idAlumno = req.params.idAlumno;
    const sql = 'SELECT id, nombre_plan FROM rutinas_header WHERE alumno_id = ?';
    
    db.query(sql, [idAlumno], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results); // Devuelve [{id: 1, nombre_plan: "PRUEBA"}, ...]
    });
});

// B. Obtener los ejercicios de una rutina específica
app.get('/api/ejercicios-rutina/:idRutina', (req, res) => {
    const idRutina = req.params.idRutina;
    const sql = 'SELECT * FROM rutina_ejercicios WHERE rutina_id = ? ORDER BY dia ASC';
    
    db.query(sql, [idRutina], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});


app.get('/api/profesor-asignado/:idAlumno', (req, res) => {
    const idAlumno = req.params.idAlumno;
    const sql = `
        SELECT u.nombre, u.apellido 
        FROM usuarios u 
        JOIN alumnos a ON u.id = a.profesor_id 
        WHERE a.id = ?`;

    db.query(sql, [idAlumno], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) {
            res.json(result[0]); // Devuelve {nombre: "Gonzalo", apellido: "Almiron"}
        } else {
            res.status(404).json({ message: "No asignado" });
        }
    });
});



app.post('/api/comentarios', (req, res) => {
    const { alumno_id, mensaje } = req.body; // Ya no pedimos profesor_id al frontend

    // 1. Buscamos quién es el profesor de este alumno en la tabla 'alumnos'
    const buscarProfeQuery = "SELECT profesor_id FROM alumnos WHERE id = ?";

    db.query(buscarProfeQuery, [alumno_id], (err, results) => {
        if (err || results.length === 0) {
            console.error("Error al buscar profesor:", err);
            return res.status(500).json({ error: "No se encontró el profesor asignado" });
        }

        const profesor_id = results[0].profesor_id;

        // 2. Ahora que tenemos el ID del profe, insertamos el comentario
        const insertarQuery = `
            INSERT INTO comentarios (alumno_id, profesor_id, mensaje, estado) 
            VALUES (?, ?, ?, 0)
        `;

        db.query(insertarQuery, [alumno_id, profesor_id, mensaje], (err, result) => {
            if (err) {
                console.error("Error al insertar comentario:", err);
                return res.status(500).json({ error: "Error al guardar mensaje" });
            }
            res.status(200).json({ message: "Mensaje enviado con éxito" });
        });
    });
});




// 1. Obtener mensajes NO LEÍDOS para un profesor
app.get('/api/comentarios/pendientes/:profeId', (req, res) => {
    const { profeId } = req.params;
    
    // Hacemos un JOIN para traer el nombre del alumno que escribió
    const sql = `
        SELECT c.id, c.mensaje, c.fecha, a.nombre as alumno_nombre
        FROM comentarios c
        JOIN alumnos a ON c.alumno_id = a.id
        WHERE c.profesor_id = ? AND c.estado = 0
        ORDER BY c.fecha DESC
    `;

    db.query(sql, [profeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Marcar mensaje como LEÍDO (Estado 1)
app.put('/api/comentarios/leer/:mensajeId', (req, res) => {
    const { mensajeId } = req.params;
    const sql = "UPDATE comentarios SET estado = 1 WHERE id = ?";

    db.query(sql, [mensajeId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Mensaje archivado" });
    });
});


// Obtener el historial completo de mensajes (leídos y no leídos)
app.get('/api/comentarios/historial/:profeId', (req, res) => {
    const { profeId } = req.params;
    
    const sql = `
        SELECT c.id, c.mensaje, c.fecha, c.estado, a.nombre as alumno_nombre
        FROM comentarios c
        JOIN alumnos a ON c.alumno_id = a.id
        WHERE c.profesor_id = ?
        ORDER BY c.fecha DESC
    `;

    db.query(sql, [profeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});



app.listen(3000, () => console.log('🚀 Servidor en http://localhost:3000'));