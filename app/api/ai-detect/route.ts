import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Se requiere una imagen" }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analiza este producto y devuelve un JSON con la siguiente estructura exacta, sin texto adicional:
{
  "name": "nombre del producto",
  "description": "descripción breve del producto",
  "category": "categoría del producto (bebidas, snacks, lácteos, limpieza, etc.)",
  "unit": "unidad de medida (unidad, litro, kg, caja, etc.)",
  "barcode": "código de barras si es visible, si no déjalo vacío"
}
Si no puedes identificar el producto, devuelve los campos con valores genéricos razonables.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "No se pudo analizar la imagen" }, { status: 422 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al detectar producto" }, { status: 500 });
  }
}
