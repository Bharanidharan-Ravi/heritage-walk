namespace ArchaeoTrails.Application.Interfaces
{
    public interface IQrCodeService
    {
        /// <summary>Returns a PNG-encoded QR code image for the given URL/text.</summary>
        byte[] GeneratePng(string content);
    }
}
