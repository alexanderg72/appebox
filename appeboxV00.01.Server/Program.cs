using appeboxV00._01.Server.Data;
using Microsoft.EntityFrameworkCore;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Add services to the container.
    builder.Services.AddHttpClient();
    builder.Services.AddControllers();

    // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    builder.Services.AddDbContext<EboxDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

    var app = builder.Build();

    // Bloque de prueba de conexión a la Base de Datos
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<EboxDbContext>();
        try
        {
            if (db.Database.CanConnect())
            {
                Console.WriteLine("¡CONEXIÓN A SQL EXITOSA!");
            }
            else
            {
                Console.WriteLine("❌ NO SE PUDO CONECTAR A LA BD");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ ERROR DE CONEXIÓN: " + ex.Message);
        }
    }

    app.UseDefaultFiles();
    app.UseStaticFiles();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();
    app.UseAuthorization();
    app.MapControllers();
    app.MapFallbackToFile("/index.html");

    app.Run();
}
catch (Exception ex)
{
    // Esto mantendrá la consola negra abierta si ocurre un error catastrófico
    Console.WriteLine("========================================");
    Console.WriteLine("❌ ERROR FATAL AL ARRANCAR EL SERVIDOR ❌");
    Console.WriteLine("========================================");
    Console.WriteLine(ex.ToString());
    Console.WriteLine("========================================");
    Console.WriteLine("Presiona cualquier tecla para cerrar la ventana...");
    Console.ReadKey();
}