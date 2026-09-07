using ArchaeoTrails.Application.Interfaces;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// DRY / STUB implementation — returns an empty byte array.
    /// TODO(form-generator): once the `QRCoder` NuGet package is added, replace
    /// GeneratePng's body with:
    ///
    ///   using var generator = new QRCodeGenerator();
    ///   using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
    ///   var pngQr = new PngByteQRCode(data);
    ///   return pngQr.GetGraphic(20);
    /// </summary>
    public class QrCodeService : IQrCodeService
    {
        public byte[] GeneratePng(string content)
        {
            // TODO(form-generator): replace with a real QRCoder call — see class docs.
            return System.Array.Empty<byte>();
        }
    }
}
