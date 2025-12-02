class ResourceNotFoundException extends Error {
    constructor(resourceName, identifier) {
        super(`${resourceName} com identificador "${identifier}" não foi encontrado.`);
        this.name = "ResourceNotFoundException";
        this.statusCode = 404;
    }
}

module.exports = ResourceNotFoundException;
