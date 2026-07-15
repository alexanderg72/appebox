using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;


namespace appeboxV00._01.Server.Data
{
    public class EboxDbContext : DbContext
    {
        public EboxDbContext(DbContextOptions<EboxDbContext> options) : base(options) { }

        // Estas propiedades crearán las tablas en SQL Server
        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Paquete> Paquetes { get; set; }
    }

    // Tabla de Clientes
    public class Cliente
    {
        [Key]
        public string Id { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string PassHash { get; set; } = string.Empty;
        public string lplan { get; set; } = "Estándar";
        public string Rol { get; set; } = "cliente";
        public DateTime FechaAlta { get; set; } = DateTime.Now;
    }

    // Tabla de Paquetes
    public class Paquete
    {
        [Key]
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string Tienda { get; set; } = string.Empty;
        public string Tracking { get; set; } = string.Empty;
        public double? PesoLb { get; set; }
        public double Valor { get; set; }
        public string Categoria { get; set; } = string.Empty;
        public int Etapa { get; set; } = 1;
        public bool Pagado { get; set; } = false;

        // Para simplificar la migración desde JavaScript, puedes guardar 
        // objetos complejos (como costos o fechas) como texto JSON en SQL
        public string? CostosJson { get; set; }
        public string? FechasJson { get; set; }
        public string? FacturaMetaJson { get; set; }
    }
}