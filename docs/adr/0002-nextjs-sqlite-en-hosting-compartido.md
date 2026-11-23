# Next.js + SQLite en hosting compartido con Node.js

La app se despliega en un hosting compartido que permite apps Node.js (Passenger), así que usamos Next.js con SQLite en un único fichero dentro del servidor, sin servicio de base de datos aparte. La elección de SQLite es "de momento": encaja con el hosting y con el volumen esperado, y no descarta pasar a Postgres más adelante.

## Considered Options

- **PHP (Laravel) + SQLite**: funciona en cualquier hosting compartido, pero se descartó porque este hosting admite Node.js y se prefiere TypeScript.
- **Postgres**: se descartó por ahora porque el hosting compartido no lo ofrece con facilidad.

## Consequences

- Se asume un único proceso de Node con acceso de escritura al fichero SQLite. Si el hosting arranca varios procesos o reinicia en un sistema de ficheros efímero, hay que revisar esta decisión.
- El fichero de la base de datos tiene que quedar fuera del directorio público y entrar en las copias de seguridad.
