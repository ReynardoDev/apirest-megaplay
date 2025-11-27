// src/middlewares/errorHandler.js

export const jsonSyntaxErrorHandler = (err, req, res, next) => {
    // Verificamos si el error es un SyntaxError generado por el parser JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        // Interceptamos el error y devolvemos 400
        return res.status(400).json({
            message: "JSON inválido. Asegúrate de que el cuerpo de la petición sea un JSON válido.",
            error_code: "INVALID_JSON_SYNTAX"
        });
    }

    // Si no es un error de JSON mal formado, pasamos el error al siguiente manejador
    next(err);
};