using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using appeboxV00._01.Server.Models;
namespace appebox.Server.Models
{
    [Table("Usuarios")]
    public class Cliente
    {
        [Key]
        public string Id { get; set; } // Ej: user-xyz123
        public string Codigo { get; set; } // Ej: EBX-10245
        public string Nombre { get; set; }
        public string Email { get; set; }
        public string Telefono { get; set; }
        public string PassHash { get; set; }
        public string Plan { get; set; }
        public string Rol { get; set; } // "user" o "admin"
        public DateTime FechaAlta { get; set; }
    }
}