import { entradas } from "./data/entradas.mjs";

/*
 * La API es pública, por lo que cualquier frontend puede consultarla.
 *
 * Para restringirla únicamente a GitHub Pages, remplaza "*" por:
 *
 * "https://TU_USUARIO.github.io"
 *
 * El origen no debe incluir la ruta del repositorio.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept"
};

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...additionalHeaders
    }
  });
}

function decodePathParameter(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeWord(value) {
  return decodePathParameter(value)
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase();
}

export default async function handler(request, context) {
  /*
   * El navegador puede enviar una petición OPTIONS antes del GET
   * debido a que GitHub Pages y Netlify tienen orígenes distintos.
   */
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  if (request.method !== "GET") {
    return jsonResponse(
      {
        error: "method_not_allowed",
        message: "Este endpoint solamente acepta solicitudes GET."
      },
      405,
      {
        Allow: "GET, OPTIONS"
      }
    );
  }

  const requestedWord = context.params?.palabra;

  /*
   * GET /jioj
   *
   * Devuelve información básica sobre la API.
   */
  if (!requestedWord) {
    return jsonResponse({
      nombre: "Jioj Dictionary API",
      version: "1.0.0",
      endpoints: {
        buscar: "/jioj/{palabra}"
      },
      ejemplo: "/jioj/ejemplo"
    });
  }

  const normalizedWord = normalizeWord(requestedWord);
  const entry = entradas[normalizedWord];

  if (!entry) {
    return jsonResponse(
      {
        error: "entry_not_found",
        message: "La palabra solicitada no se encuentra en el diccionario.",
        palabra: decodePathParameter(requestedWord)
      },
      404
    );
  }

  return jsonResponse({
    data: entry
  });
}

/*
 * Rutas públicas de esta función.
 *
 * GET /jioj
 * GET /jioj/:palabra
 */
export const config = {
  path: ["/jioj", "/jioj/:palabra"]
};