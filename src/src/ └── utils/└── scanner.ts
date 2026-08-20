import {
  Camera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import { Ocr } from "@capacitor-community/image-to-text";

/**
 * Convierte un número reconocido por OCR a valor decimal.
 *
 * Ejemplos:
 * 1,35 -> 1.35
 * 1.35 -> 1.35
 */
function parseLocaleDecimal(value: string): number {
  return Number.parseFloat(value.replace(",", "."));
}

/**
 * Devuelve el precio con dos decimales.
 */
function formatPrice(value: number): string {
  return value.toFixed(2);
}

/**
 * Comprueba si un valor puede considerarse un precio razonable.
 *
 * El objetivo es evitar que números como años, cantidades enormes
 * o códigos de productos sean seleccionados como precio.
 */
function isValidPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 10000;
}

/**
 * Busca un precio asociado a REF / Ref / ref.
 *
 * Ejemplos:
 * REF 1.35
 * Ref 1,35
 * ref 2.10
 * 1.35 REF
 *
 * También contempla una posible separación del decimal provocada
 * por el OCR:
 *
 * REF 1 35 -> 1.35
 */
function findRefPrice(text: string): number | null {
  const patterns = [
    // REF 1.35 / Ref 1,35 / ref 2.10
    /\bref\b[\s:=-]*([0-9]{1,4}(?:[.,][0-9]{1,2})?)/i,

    // 1.35 REF / 1,35 ref
    /([0-9]{1,4}(?:[.,][0-9]{1,2})?)\s*\bref\b/i,

    // REF 1 35
    /\bref\b[\s:=-]*([0-9]{1,4})\s+([0-9]{1,2})\b/i,

    // 1 35 REF
    /\b([0-9]{1,4})\s+([0-9]{1,2})\s*\bref\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    let rawValue: string;

    if (match[2] !== undefined) {
      rawValue = `${match[1]}.${match[2]}`;
    } else {
      rawValue = match[1];
    }

    const value = parseLocaleDecimal(rawValue);

    if (isValidPrice(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Busca un precio asociado a dólar.
 *
 * Ejemplos:
 * $1.35
 * $ 1.35
 * USD 1.35
 * US$1.35
 * 1.35 USD
 * 1.35 $
 *
 * También contempla que OCR separe un decimal:
 * $ 1 35
 */
function findDollarPrice(text: string): number | null {
  const patterns = [
    // $ 1.35 / $1.35 / USD 1.35 / US$1.35
    /(?:US\$|USD|\$)\s*([0-9]{1,4}(?:[.,][0-9]{1,2})?)/i,

    // 1.35 USD / 1.35 $ / 1.35 US$
    /([0-9]{1,4}(?:[.,][0-9]{1,2})?)\s*(?:USD|US\$|\$)\b/i,

    // $ 1 35
    /(?:US\$|USD|\$)\s*([0-9]{1,4})\s+([0-9]{1,2})\b/i,

    // 1 35 USD
    /([0-9]{1,4})\s+([0-9]{1,2})\s*(?:USD|US\$|\$)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    let rawValue: string;

    if (match[2] !== undefined) {
      rawValue = `${match[1]}.${match[2]}`;
    } else {
      rawValue = match[1];
    }

    const value = parseLocaleDecimal(rawValue);

    if (isValidPrice(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Busca un precio asociado al euro.
 *
 * Ejemplos:
 * €1.50
 * € 1,50
 * EUR 1.50
 * 1.50 EUR
 */
function findEuroPrice(text: string): number | null {
  const patterns = [
    /(?:EUR|€)\s*([0-9]{1,4}(?:[.,][0-9]{1,2})?)/i,

    /([0-9]{1,4}(?:[.,][0-9]{1,2})?)\s*(?:EUR|€)\b/i,

    /(?:EUR|€)\s*([0-9]{1,4})\s+([0-9]{1,2})\b/i,

    /([0-9]{1,4})\s+([0-9]{1,2})\s*(?:EUR|€)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    let rawValue: string;

    if (match[2] !== undefined) {
      rawValue = `${match[1]}.${match[2]}`;
    } else {
      rawValue = match[1];
    }

    const value = parseLocaleDecimal(rawValue);

    if (isValidPrice(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Último recurso:
 * busca números decimales aunque no tengan un identificador monetario.
 *
 * Ejemplo:
 * Harina Pan 1.35
 *
 * Solamente utilizamos esta estrategia cuando no encontramos
 * REF, dólar ni euro.
 */
function findStandaloneDecimalPrice(text: string): number | null {
  const matches = text.match(
    /\b\d{1,4}(?:[.,]\d{1,2})\b/g
  );

  if (!matches || matches.length === 0) {
    return null;
  }

  const candidates = matches
    .map(parseLocaleDecimal)
    .filter(isValidPrice);

  if (candidates.length === 0) {
    return null;
  }

  /**
   * Preferimos valores pequeños y decimales, que son los más
   * habituales para productos de supermercado.
   *
   * Ejemplos:
   * 1.05
   * 1.35
   * 1.45
   * 2.10
   */
  const smallDecimal = candidates.find(
    (value) => value > 0 && value < 100 && value % 1 !== 0
  );

  if (smallDecimal !== undefined) {
    return smallDecimal;
  }

  return candidates[0];
}

/**
 * Determina el precio a partir del texto OCR.
 *
 * PRIORIDAD:
 *
 * 1. REF / Ref / ref
 * 2. Dólar: $, US$, USD
 * 3. Euro: €, EUR
 * 4. Número decimal sin símbolo
 *
 * REF se interpreta como precio de referencia en divisas y,
 * para Rinde+, se incorpora al campo de precio utilizado
 * actualmente por la aplicación.
 */
function extractCurrencyPrice(text: string): string | null {
  if (!text) {
    return null;
  }

  const normalizedText = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  console.log(
    "Texto normalizado para análisis:",
    normalizedText
  );

  // =========================================================
  // PRIORIDAD 1: REF
  // =========================================================
  const refPrice = findRefPrice(normalizedText);

  if (refPrice !== null) {
    console.log("Precio detectado mediante REF:", refPrice);
    return formatPrice(refPrice);
  }

  // =========================================================
  // PRIORIDAD 2: DÓLAR
  // =========================================================
  const dollarPrice = findDollarPrice(normalizedText);

  if (dollarPrice !== null) {
    console.log(
      "Precio detectado mediante dólar:",
      dollarPrice
    );

    return formatPrice(dollarPrice);
  }

  // =========================================================
  // PRIORIDAD 3: EURO
  // =========================================================
  const euroPrice = findEuroPrice(normalizedText);

  if (euroPrice !== null) {
    console.log(
      "Precio detectado mediante euro:",
      euroPrice
    );

    return formatPrice(euroPrice);
  }

  // =========================================================
  // PRIORIDAD 4: DECIMAL SIN SÍMBOLO
  // =========================================================
  const standalonePrice =
    findStandaloneDecimalPrice(normalizedText);

  if (standalonePrice !== null) {
    console.log(
      "Precio detectado como decimal independiente:",
      standalonePrice
    );

    return formatPrice(standalonePrice);
  }

  return null;
}

/**
 * Escanea una fotografía y obtiene el precio.
 */
export async function scanCurrencyAmount(): Promise<string | null> {
  try {
    // -------------------------------------------------------
    // 1. Abrir cámara
    // -------------------------------------------------------
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    // -------------------------------------------------------
    // 2. Comprobar ruta de la imagen
    // -------------------------------------------------------
    if (!photo.path) {
      console.error(
        "No se obtuvo la ruta local de la fotografía."
      );

      return null;
    }

    // -------------------------------------------------------
    // 3. Ejecutar OCR con ML Kit
    // -------------------------------------------------------
    const result = await Ocr.detectText({
      filename: photo.path,
    });

    // -------------------------------------------------------
    // 4. Unir todas las detecciones
    // -------------------------------------------------------
    const detectedText = (result.textDetections ?? [])
      .map((detection) => detection.text)
      .join(" ");

    console.log(
      "Texto detectado por OCR:",
      detectedText
    );

    // -------------------------------------------------------
    // 5. Identificar precio
    // -------------------------------------------------------
    const price = extractCurrencyPrice(detectedText);

    if (!price) {
      console.warn(
        "No se encontró un precio válido en la imagen."
      );

      return null;
    }

    console.log(
      "Precio USD detectado:",
      price
    );

    return price;
  } catch (error) {
    console.error(
      "Error al escanear el precio:",
      error
    );

    return null;
  }
}
