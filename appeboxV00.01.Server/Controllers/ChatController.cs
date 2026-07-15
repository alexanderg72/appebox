using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace EboxWeb.Controllers
{
    [Route("api/chat")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        // Inyectamos el HttpClient y la configuración
        public ChatController(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        [HttpPost("preguntar")]
        public async Task<IActionResult> PreguntarAlAsistente([FromBody] ChatRequest request)
        {
            // 1. Obtenemos la llave segura desde appsettings.json
            var apiKey = _configuration["AnthropicApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { error = "API Key no configurada en el servidor." });
            }

            // 2. Armamos la estructura exacta que pide la API de Claude
            var claudePayload = new
            {
                model = "claude-sonnet-5", // Puedes usar claude-3-haiku-20240307 para mayor velocidad
                max_tokens = 1000,
                messages = new[]
                {
                    new { role = "user", content = request.Mensaje }
                }
            };

            // 3. Configuramos la petición HTTP hacia Anthropic
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            httpRequest.Headers.Add("x-api-key", apiKey);
            httpRequest.Headers.Add("anthropic-version", "2023-06-01");

            var jsonPayload = JsonSerializer.Serialize(claudePayload);
            httpRequest.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            // 4. Ejecutamos la llamada
            var response = await _httpClient.SendAsync(httpRequest);
            var jsonResponse = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                // Si Claude devuelve un error (ej. sin saldo, mala llave), lo pasamos al cliente
                return StatusCode((int)response.StatusCode, jsonResponse);
            }

            // 5. Devolvemos el JSON crudo de Claude directamente a React.
            // React se encargará de extraer el texto haciendo: data.content[0].text
            return Content(jsonResponse, "application/json");
        }
    }

    // DTO para recibir el Body que manda React
    public class ChatRequest
    {
        public string Mensaje { get; set; }
        public string ClienteId { get; set; }
    }
}