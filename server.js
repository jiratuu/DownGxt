const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

const app = express();

const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const BIN_DIR = path.join(ROOT, "bin");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");


// =====================================================
// DOSSIERS
// =====================================================

fs.mkdirSync(BIN_DIR, {
    recursive: true
});

fs.mkdirSync(DOWNLOAD_DIR, {
    recursive: true
});


// =====================================================
// EXPRESS
// =====================================================

app.use(express.json({
    limit: "1mb"
}));

app.use(express.static(PUBLIC_DIR));


// =====================================================
// OUTILS
// =====================================================

function exists(file) {

    try {

        return fs.existsSync(file) &&
               fs.statSync(file).isFile();

    } catch {

        return false;

    }

}


// =====================================================
// TROUVER PROGRAMME DANS LE PATH
// =====================================================

function findInPath(program) {

    const command =
        process.platform === "win32"
            ? "where.exe"
            : "which";

    try {

        const result =
            spawnSync(
                command,
                [program],
                {
                    encoding: "utf8",
                    windowsHide: true
                }
            );

        if (
            result.status === 0 &&
            result.stdout
        ) {

            const lines =
                result.stdout
                    .trim()
                    .split(/\r?\n/)
                    .map(x => x.trim())
                    .filter(Boolean);

            if (lines.length) {

                return lines[0];

            }

        }

    } catch {}

    return null;

}


// =====================================================
// TROUVER YT-DLP
// =====================================================

function findYTDLP() {

    const exe =
        process.platform === "win32"
            ? "yt-dlp.exe"
            : "yt-dlp";


    // -------------------------------------------------
    // BIN LOCAL
    // -------------------------------------------------

    const local =
        path.join(
            BIN_DIR,
            exe
        );


    if (exists(local)) {

        console.log(
            "[YTDLP] Local :",
            local
        );

        return {

            command: local,

            prefixArgs: []

        };

    }


    // -------------------------------------------------
    // PATH
    // -------------------------------------------------

    const system =
        findInPath(
            "yt-dlp"
        );


    if (system) {

        console.log(
            "[YTDLP] PATH :",
            system
        );

        return {

            command: system,

            prefixArgs: []

        };

    }


    // -------------------------------------------------
    // WINDOWS PYTHON
    // -------------------------------------------------

    if (
        process.platform === "win32"
    ) {

        try {

            const result =
                spawnSync(
                    "py",
                    [
                        "-m",
                        "yt_dlp",
                        "--version"
                    ],
                    {
                        encoding: "utf8",
                        windowsHide: true
                    }
                );


            if (
                result.status === 0 &&
                result.stdout
            ) {

                console.log(
                    "[YTDLP] Python : py -m yt_dlp"
                );

                return {

                    command: "py",

                    prefixArgs: [
                        "-m",
                        "yt_dlp"
                    ]

                };

            }

        } catch {}

    }


    return null;

}


// =====================================================
// TROUVER FFMPEG
// =====================================================

function findFFmpeg() {

    const exe =
        process.platform === "win32"
            ? "ffmpeg.exe"
            : "ffmpeg";


    const local =
        path.join(
            BIN_DIR,
            exe
        );


    if (exists(local)) {

        return local;

    }


    return findInPath(
        "ffmpeg"
    );

}


const YTDLP = findYTDLP();
const FFMPEG = findFFmpeg();


// =====================================================
// INFORMATIONS
// =====================================================

console.log("");
console.log("======================================");
console.log("              DOWNGXT");
console.log("======================================");
console.log("");

console.log(
    "Platform :",
    process.platform
);

console.log(
    "Node     :",
    process.version
);

console.log(
    "yt-dlp   :",
    YTDLP
        ? YTDLP.command
        : "INTROUVABLE"
);

console.log(
    "ffmpeg   :",
    FFMPEG
        ? FFMPEG
        : "INTROUVABLE"
);

console.log("");


// =====================================================
// EXÉCUTER COMMANDE
// =====================================================

function runCommand(
    command,
    args
) {

    return new Promise(
        function(resolve, reject) {

            let child;

            try {

                child =
                    spawn(
                        command,
                        args,
                        {
                            windowsHide: true,
                            shell: false,
                            env: {
                                ...process.env
                            }
                        }
                    );

            } catch (error) {

                reject(error);

                return;

            }


            let stdout = "";
            let stderr = "";


            child.stdout.on(
                "data",
                data => {

                    stdout +=
                        data.toString();

                }
            );


            child.stderr.on(
                "data",
                data => {

                    stderr +=
                        data.toString();

                }
            );


            child.on(
                "error",
                error => {

                    reject(error);

                }
            );


            child.on(
                "close",
                code => {

                    if (
                        code === 0
                    ) {

                        resolve(
                            stdout
                        );

                        return;

                    }


                    reject(
                        new Error(
                            stderr.trim() ||
                            stdout.trim() ||
                            `${command} a échoué.`
                        )
                    );

                }
            );

        }
    );

}


// =====================================================
// EXÉCUTER YT-DLP
// =====================================================

function runYTDLP(args) {

    if (!YTDLP) {

        return Promise.reject(
            new Error(
                "yt-dlp est introuvable."
            )
        );

    }


    return runCommand(
        YTDLP.command,
        [
            ...YTDLP.prefixArgs,
            ...args
        ]
    );

}


// =====================================================
// STATUS
// =====================================================

app.get(
    "/api/status",
    async function(req, res) {

        try {

            const version =
                await runYTDLP([
                    "--version"
                ]);


            res.json({

                online: true,

                version:
                    version.trim(),

                ytDlp: true,

                ffmpeg:
                    !!FFMPEG,

                platform:
                    process.platform

            });

        } catch (error) {

            res.status(500).json({

                online: false,

                ytDlp: false,

                ffmpeg:
                    !!FFMPEG,

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// INFORMATIONS VIDÉO
// =====================================================

app.post(
    "/api/info",
    async function(req, res) {

        const url =
            typeof req.body.url === "string"
                ? req.body.url.trim()
                : "";


        if (!url) {

            return res.status(400).json({

                error:
                    "URL manquante."

            });

        }


        try {

            const output =
                await runYTDLP([

                    "--dump-single-json",

                    "--no-playlist",

                    "--no-warnings",

                    "--skip-download",

                    "--no-check-certificates",

                    url

                ]);


            const data =
                JSON.parse(output);


            res.json({

                id:
                    data.id || "",

                title:
                    data.title ||
                    "Vidéo sans titre",

                uploader:
                    data.uploader ||
                    data.channel ||
                    "Chaîne inconnue",

                duration:
                    Number(data.duration) || 0,

                thumbnail:
                    data.thumbnail || "",

                url:
                    data.webpage_url ||
                    url

            });


        } catch (error) {

            console.error(
                "[INFO ERROR]",
                error.message
            );


            let message =
                error.message;


            if (
                message.includes(
                    "Sign in to confirm"
                )
            ) {

                message =
                    "YouTube bloque cette requête depuis le serveur Render. " +
                    "Cette vidéo nécessite une authentification/cookies " +
                    "ou YouTube bloque actuellement l'adresse IP du serveur.";

            }


            res.status(500).json({

                error:
                    message

            });

        }

    }
);


// =====================================================
// TÉLÉCHARGEMENT
// =====================================================

app.get(
    "/api/download",
    async function(req, res) {

        const url =
            typeof req.query.url === "string"
                ? req.query.url.trim()
                : "";


        const format =
            req.query.format === "mp3"
                ? "mp3"
                : "mp4";


        const quality =
            typeof req.query.quality === "string"
                ? req.query.quality
                : "best";


        if (!url) {

            return res.status(400).send(
                "URL manquante."
            );

        }


        const allowedQualities = [
            "best",
            "1080",
            "720",
            "480"
        ];


        if (
            !allowedQualities.includes(
                quality
            )
        ) {

            return res.status(400).send(
                "Qualité invalide."
            );

        }


        const id =
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8);


        const output =
            path.join(
                DOWNLOAD_DIR,
                id + ".%(ext)s"
            );


        const args = [

            "--no-playlist",

            "--newline",

            "--no-warnings",

            "--no-check-certificates",

            "--retries",
            "3",

            "--fragment-retries",
            "3",

            "-o",
            output

        ];


        // =================================================
        // MP3
        // =================================================

        if (
            format === "mp3"
        ) {

            if (!FFMPEG) {

                return res.status(500).send(
                    "FFmpeg est introuvable sur le serveur."
                );

            }


            args.push(

                "-x",

                "--audio-format",
                "mp3",

                "--audio-quality",
                "0"

            );

        }


        // =================================================
        // MP4
        // =================================================

        else {

            let videoFormat;


            if (
                quality === "1080"
            ) {

                videoFormat =
                    "bestvideo[height<=1080]+bestaudio/best[height<=1080]";

            }

            else if (
                quality === "720"
            ) {

                videoFormat =
                    "bestvideo[height<=720]+bestaudio/best[height<=720]";

            }

            else if (
                quality === "480"
            ) {

                videoFormat =
                    "bestvideo[height<=480]+bestaudio/best[height<=480]";

            }

            else {

                videoFormat =
                    "bestvideo+bestaudio/best";

            }


            args.push(

                "-f",
                videoFormat,

                "--merge-output-format",
                "mp4"

            );

        }


        args.push(url);


        console.log("");
        console.log("======================================");
        console.log("DOWNLOAD");
        console.log("======================================");
        console.log("URL     :", url);
        console.log("FORMAT  :", format);
        console.log("QUALITY :", quality);
        console.log("======================================");
        console.log("");


        try {

            await runYTDLP(
                args
            );


            const files =
                fs.readdirSync(
                    DOWNLOAD_DIR
                );


            const filename =
                files.find(
                    file =>
                        file.startsWith(
                            id + "."
                        )
                );


            if (!filename) {

                throw new Error(
                    "Le téléchargement est terminé mais le fichier est introuvable."
                );

            }


            const filePath =
                path.join(
                    DOWNLOAD_DIR,
                    filename
                );


            res.download(
                filePath,
                filename,
                error => {

                    if (error) {

                        console.error(
                            "[SEND ERROR]",
                            error.message
                        );

                    }


                    setTimeout(
                        () => {

                            try {

                                if (
                                    fs.existsSync(
                                        filePath
                                    )
                                ) {

                                    fs.unlinkSync(
                                        filePath
                                    );

                                }

                            } catch {}

                        },
                        10000
                    );

                }
            );


        } catch (error) {

            console.error(
                "[DOWNLOAD ERROR]",
                error.message
            );


            let message =
                error.message;


            if (
                message.includes(
                    "Sign in to confirm"
                )
            ) {

                message =
                    "YouTube bloque actuellement les requêtes provenant de Render. " +
                    "yt-dlp fonctionne, mais YouTube demande une authentification " +
                    "ou bloque l'IP du serveur.";

            }


            if (
                !res.headersSent
            ) {

                res.status(500).send(
                    message
                );

            }

        }

    }
);


// =====================================================
// PAGE
// =====================================================

app.use(
    function(req, res) {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

    }
);


// =====================================================
// SERVEUR
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    function() {

        console.log("");
        console.log(
            "Serveur démarré sur le port " +
            PORT
        );
        console.log("");

    }
);