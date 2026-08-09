const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

const app = express();

const PORT = 3000;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const BIN_DIR = path.join(ROOT, "bin");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");

// =====================================================
// DOSSIERS
// =====================================================

if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
}

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// =====================================================
// EXPRESS
// =====================================================

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// =====================================================
// OUTILS
// =====================================================

function fileExists(file) {
    try {
        return fs.existsSync(file) && fs.statSync(file).isFile();
    } catch {
        return false;
    }
}


// =====================================================
// TROUVER UN PROGRAMME DANS LE PATH
// =====================================================

function findInPath(program) {

    const command =
        process.platform === "win32"
            ? "where.exe"
            : "which";

    try {

        const result = spawnSync(
            command,
            [program],
            {
                encoding: "utf8",
                windowsHide: true
            }
        );

        if (result.status === 0 && result.stdout) {

            const lines =
                result.stdout
                    .trim()
                    .split(/\r?\n/)
                    .map(x => x.trim())
                    .filter(Boolean);

            if (lines.length > 0) {
                return lines[0];
            }
        }

    } catch {}

    return null;
}


// =====================================================
// TROUVER FFMPEG
// =====================================================

function findFFmpeg() {

    const extension =
        process.platform === "win32"
            ? ".exe"
            : "";

    const localFile =
        path.join(
            BIN_DIR,
            "ffmpeg" + extension
        );

    if (fileExists(localFile)) {
        return localFile;
    }

    const pathFile =
        findInPath("ffmpeg");

    if (pathFile) {
        return pathFile;
    }

    return null;
}


// =====================================================
// TROUVER YT-DLP
// =====================================================

function findYTDLP() {

    const extension =
        process.platform === "win32"
            ? ".exe"
            : "";

    // -------------------------------------------------
    // 1. BIN LOCAL
    // -------------------------------------------------

    const localFile =
        path.join(
            BIN_DIR,
            "yt-dlp" + extension
        );

    if (fileExists(localFile)) {

        console.log(
            "[YTDLP] Trouvé en local :",
            localFile
        );

        return {
            command: localFile,
            prefixArgs: []
        };
    }


    // -------------------------------------------------
    // 2. PATH
    // -------------------------------------------------

    const pathFile =
        findInPath("yt-dlp");

    if (pathFile) {

        console.log(
            "[YTDLP] Trouvé dans le PATH :",
            pathFile
        );

        return {
            command: pathFile,
            prefixArgs: []
        };
    }


    // -------------------------------------------------
    // 3. PY -M YT_DLP
    // -------------------------------------------------

    if (process.platform === "win32") {

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
                result.stdout &&
                result.stdout.trim()
            ) {

                console.log(
                    "[YTDLP] Trouvé via : py -m yt_dlp"
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


    // -------------------------------------------------
    // 4. PYTHON -M YT_DLP
    // -------------------------------------------------

    try {

        const result =
            spawnSync(
                "python",
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
            result.stdout &&
            result.stdout.trim()
        ) {

            console.log(
                "[YTDLP] Trouvé via : python -m yt_dlp"
            );

            return {
                command: "python",
                prefixArgs: [
                    "-m",
                    "yt_dlp"
                ]
            };
        }

    } catch {}


    // -------------------------------------------------
    // RIEN TROUVÉ
    // -------------------------------------------------

    return null;
}


// =====================================================
// DÉTECTION
// =====================================================

const YTDLP = findYTDLP();
const FFMPEG = findFFmpeg();


// =====================================================
// INFORMATIONS SERVEUR
// =====================================================

console.log("");
console.log("======================================");
console.log("              DOWNGXT");
console.log("======================================");
console.log("");

console.log(
    "Système :",
    process.platform
);

console.log(
    "Node.js :",
    process.version
);

console.log("");

if (YTDLP) {

    console.log(
        "yt-dlp :",
        YTDLP.command,
        YTDLP.prefixArgs.length
            ? "(" + YTDLP.prefixArgs.join(" ") + ")"
            : ""
    );

} else {

    console.log(
        "yt-dlp : INTROUVABLE"
    );

}


if (FFMPEG) {

    console.log(
        "ffmpeg :",
        FFMPEG
    );

} else {

    console.log(
        "ffmpeg : INTROUVABLE"
    );

}

console.log("");

console.log(
    "Serveur : http://localhost:" + PORT
);

console.log("");


// =====================================================
// EXÉCUTER UNE COMMANDE
// =====================================================

function runCommand(command, args) {

    return new Promise(function(resolve, reject) {

        let child;

        try {

            child = spawn(
                command,
                args,
                {
                    windowsHide: true,
                    shell: false
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
            function(data) {

                stdout += data.toString();

            }
        );


        child.stderr.on(
            "data",
            function(data) {

                stderr += data.toString();

            }
        );


        child.on(
            "error",
            function(error) {

                if (error.code === "ENOENT") {

                    reject(
                        new Error(
                            command +
                            " est introuvable. " +
                            "Vérifie son installation."
                        )
                    );

                    return;

                }

                reject(error);

            }
        );


        child.on(
            "close",
            function(code) {

                if (code === 0) {

                    resolve(stdout);

                } else {

                    reject(
                        new Error(
                            stderr.trim() ||
                            stdout.trim() ||
                            command +
                            " a rencontré une erreur."
                        )
                    );

                }

            }
        );

    });

}


// =====================================================
// EXÉCUTER YT-DLP
// =====================================================

function runYTDLP(args) {

    if (!YTDLP) {

        return Promise.reject(
            new Error(
                "yt-dlp est introuvable. " +
                "Installe yt-dlp ou place yt-dlp.exe dans le dossier bin."
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
                await runYTDLP(
                    ["--version"]
                );


            res.json({

                online: true,

                version:
                    version.trim(),

                ytDlp: true,

                ffmpeg:
                    !!FFMPEG

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

        try {

            const url =
                req.body.url;


            if (!url) {

                return res.status(400).json({

                    error:
                        "URL manquante."

                });

            }


            const output =
                await runYTDLP(
                    [
                        "--dump-single-json",
                        "--no-playlist",
                        "--no-warnings",
                        "--skip-download",
                        url
                    ]
                );


            const data =
                JSON.parse(output);


            res.json({

                id:
                    data.id,

                title:
                    data.title ||
                    "Vidéo sans titre",

                uploader:
                    data.uploader ||
                    "Chaîne inconnue",

                duration:
                    data.duration ||
                    0,

                thumbnail:
                    data.thumbnail ||
                    "",

                url:
                    data.webpage_url ||
                    url

            });

        } catch (error) {

            console.error(
                "[INFO ERROR]",
                error.message
            );


            res.status(500).json({

                error:
                    error.message

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
            req.query.url;

        const format =
            req.query.format ||
            "mp4";

        const quality =
            req.query.quality ||
            "best";


        if (!url) {

            return res.status(400).send(
                "URL manquante."
            );

        }


        if (
            format !== "mp4" &&
            format !== "mp3"
        ) {

            return res.status(400).send(
                "Format invalide."
            );

        }


        const randomPart =
            Math.random()
                .toString(36)
                .substring(2, 8);


        const id =
            Date.now() +
            "_" +
            randomPart;


        const output =
            path.join(
                DOWNLOAD_DIR,
                id + ".%(ext)s"
            );


        const args = [

            "--no-playlist",

            "--newline",

            "--no-warnings",

            "-o",
            output

        ];


        // =================================================
        // MP3
        // =================================================

        if (format === "mp3") {

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


            if (quality === "1080") {

                videoFormat =
                    "bestvideo[height<=1080]+bestaudio/best[height<=1080]";

            }

            else if (quality === "720") {

                videoFormat =
                    "bestvideo[height<=720]+bestaudio/best[height<=720]";

            }

            else if (quality === "480") {

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


        // =================================================
        // URL
        // =================================================

        args.push(url);


        console.log("");
        console.log("======================================");
        console.log("DOWNLOAD");
        console.log("======================================");
        console.log("URL      :", url);
        console.log("FORMAT   :", format);
        console.log("QUALITY  :", quality);
        console.log("YTDLP    :", YTDLP ? YTDLP.command : "NONE");
        console.log("FFMPEG   :", FFMPEG || "NONE");
        console.log("======================================");
        console.log("");


        try {

            await runYTDLP(args);


            const files =
                fs.readdirSync(
                    DOWNLOAD_DIR
                );


            const filename =
                files.find(
                    function(file) {

                        return file.indexOf(
                            id + "."
                        ) === 0;

                    }
                );


            if (!filename) {

                throw new Error(
                    "Le fichier téléchargé est introuvable."
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
                function(error) {

                    if (error) {

                        console.error(
                            "[SEND ERROR]",
                            error.message
                        );

                    }


                    setTimeout(
                        function() {

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

                            } catch (cleanupError) {

                                console.error(
                                    "Erreur nettoyage :",
                                    cleanupError.message
                                );

                            }

                        },
                        5000
                    );

                }
            );


        } catch (error) {

            console.error("");
            console.error(
                "[DOWNLOAD ERROR]",
                error.message
            );
            console.error("");


            if (!res.headersSent) {

                res.status(500).send(
                    error.message
                );

            }

        }

    }
);


// =====================================================
// PAGE PRINCIPALE
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
    function() {

        console.log(
            "Serveur démarré sur http://localhost:" +
            PORT
        );

    }
);