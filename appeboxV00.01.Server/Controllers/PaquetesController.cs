using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using appeboxV00._01.Server.Data;

namespace appeboxV00._01.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaquetesController : ControllerBase
    {
        private readonly EboxDbContext _db;

        public PaquetesController(EboxDbContext db)
        {
            _db = db;
        }

        // GET /api/paquetes — Obtener todos los paquetes
        [HttpGet]
        public async Task<IActionResult> GetTodosPaquetes()
        {
            var paquetes = await _db.Paquetes.ToListAsync();
            return Ok(paquetes);
        }

        // GET /api/paquetes/usuario/{userId}
        [HttpGet("usuario/{userId}")]
        public async Task<IActionResult> GetPaquetesUsuario(string userId)
        {
            var paquetes = await _db.Paquetes.Where(p => p.UserId == userId).ToListAsync();
            return Ok(paquetes);
        }

        // POST /api/paquetes — Guardar nueva pre-alerta
        [HttpPost]
        public async Task<IActionResult> CrearPaquete([FromBody] Paquete nuevoPaquete)
        {
            try
            {
                // 1. Agrega el nuevo paquete que envió la página web a la base de datos
                _db.Paquetes.Add(nuevoPaquete);

                // 2. Guarda los cambios en SQL Server
                await _db.SaveChangesAsync();

                // 3. Le responde a la página web que todo salió bien (Status 200)
                return Ok(nuevoPaquete);
            }
            catch (Exception ex)
            {
                // Si la base de datos falla, manda un error al frontend
                return StatusCode(500, "Error guardando la pre-alerta: " + ex.Message);
            }
        }
    }
}