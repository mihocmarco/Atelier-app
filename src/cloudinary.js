// Cloudinary: stocare pentru poze și video, plan gratuit, fără card.
// Foloseste un "unsigned upload preset" — vezi README pentru cum îl creezi.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(fileOrBlob, resourceType = "image") {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", fileOrBlob);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error("Cloudinary upload failed: " + detail);
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
