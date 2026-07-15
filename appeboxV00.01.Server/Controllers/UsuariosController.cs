using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using appeboxV00._01.Server.Data;
// Asegúrate de tener esta importación

namespace appeboxV00._01.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly EboxDbContext _db;

        public UsuariosController(EboxDbContext db)
        {
            _db = db;
        }

        // POST /api/usuarios/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            // Buscamos al usuario por su email
            var usuario = await _db.Clientes.FirstOrDefaultAsync(u => u.Email == req.Email);

            // Comparamos directamente en texto plano (según tu requerimiento)
            // Nota: req.Pass debe coincidir con el campo Password o PassHash en tu BD
            if (usuario == null || usuario.PassHash != req.Pass)
            {
                return Unauthorized(new { message = "Correo o contraseña incorrectos." });
            }

            return Ok(new
            {
                id = usuario.Id,
                nombre = usuario.Nombre,
                rol = usuario.Rol
            });
        }

        // GET /api/usuarios
        [HttpGet]
        public async Task<IActionResult> GetTodosUsuarios()
        {
            var usuarios = await _db.Clientes.ToListAsync();
            return Ok(usuarios);
        }

        // POST /api/usuarios/registro
        [HttpPost("registro")]
        public async Task<IActionResult> Registro([FromBody] RegistroRequest req)
        {
            var existe = await _db.Clientes.AnyAsync(u => u.Email == req.Email);
            if (existe) return BadRequest("El correo ya está registrado");

            var nuevo = new Cliente
            {
                Id = "user-" + Guid.NewGuid().ToString().Substring(0, 8),
                Codigo = "EBX-" + new Random().Next(10000, 99999),
                Nombre = req.Nombre,
                Email = req.Email,
                Telefono = req.Telefono,
                PassHash = req.Pass, // Guardando en texto plano
                lplan = "Estándar",
                Rol = "cliente",
                FechaAlta = DateTime.Now
            };

            _db.Clientes.Add(nuevo);
            await _db.SaveChangesAsync();
            return Ok(nuevo);
        }

        // PUT /api/usuarios/{id}/rol
        [HttpPut("{id}/rol")]
        public async Task<IActionResult> CambiarRol(string id, [FromBody] CambiarRolRequest req)
        {
            // Buscamos al usuario en la base de datos
            var usuario = await _db.Clientes.FirstOrDefaultAsync(u => u.Id == id);

            if (usuario == null)
            {
                return NotFound(new { message = "Usuario no encontrado" });
            }

            // Actualizamos el rol
            usuario.Rol = req.Rol;
            await _db.SaveChangesAsync();

            // Devolvemos el usuario actualizado
            return Ok(usuario);
        }
    }

    // Clases auxiliares limpias
    public class LoginRequest { public string Email { get; set; } = string.Empty; public string Pass { get; set; } = string.Empty; }
    public class RegistroRequest { public string Nombre { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public string Telefono { get; set; } = string.Empty; public string Pass { get; set; } = string.Empty; }

    // Nueva clase auxiliar para el cambio de rol
    public class CambiarRolRequest { public string Rol { get; set; } = string.Empty; }
}