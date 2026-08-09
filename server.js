const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

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
// TROUVER UN PROGRAMME
// =====================================================

function findProgram(name) {

    var extension = "";

    if (process.platform === "win32") {
        extension = ".exe";
    }

    var localFile =
        path.join(
            BIN_DIR,
            name + extension
        );

    if (fs.existsSync(localFile)) {
        return localFile;
    }

    return name;
}


var YTDLP = findProgram("yt-dlp");
var FFMPEG = findProgram("ffmpeg");


// =====================================================
// INFORMATIONS
// =====================================================

console.log("");
console.log("======================================");
console.log("              DOWNTUBE");
console.log("======================================");
console.log("");
console.log(
    "Serveur : http://localhost:" + PORT
);
console.log("");
console.log(
    "yt-dlp : " + YTDLP
);
console.log(
    "ffmpeg : " + FFMPEG
);
console.log("");


// =====================================================
// EXECUTER UNE COMMANDE
// =====================================================

function runCommand(command, args) {

    return new Promise(function(resolve, reject) {

        var child;

        try {

            child = spawn(
                command,
                args,
                {
                    windowsHide: true
                }
            );

        } catch (error) {

            reject(error);
            return;

        }


        var stdout = "";
        var stderr = "";


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
                            "Vérifie qu'il est installé."
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
                            stderr ||
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
// STATUS
// =====================================================

app.get(
    "/api/status",
    async function(req, res) {

        try {

            var version =
                await runCommand(
                    YTDLP,
                    ["--version"]
                );


            res.json({

                online: true,

                version:
                    version.trim()

            });


        } catch (error) {

            res.status(500).json({

                online: false,

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// INFORMATIONS VIDEO
// =====================================================

app.post(
    "/api/info",
    async function(req, res) {

        try {

            var url =
                req.body.url;


            if (!url) {

                return res.status(400).json({

                    error:
                        "URL manquante."

                });

            }


            var output =
                await runCommand(
                    YTDLP,
                    [
                        "--dump-single-json",
                        "--no-playlist",
                        "--no-warnings",
                        "--skip-download",
                        url
                    ]
                );


            var data =
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
// TELECHARGEMENT
// =====================================================

app.get(
    "/api/download",
    async function(req, res) {

        var url =
            req.query.url;

        var format =
            req.query.format ||
            "mp4";

        var quality =
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


        var randomPart =
            Math.random()
                .toString(36)
                .substring(2, 8);


        var id =
            Date.now() +
            "_" +
            randomPart;


        var output =
            path.join(
                DOWNLOAD_DIR,
                id + ".%(ext)s"
            );


        var args = [

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

            var videoFormat;


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


        args.push(url);


        console.log("");
        console.log("======================================");
        console.log("DOWNLOAD");
        console.log("======================================");
        console.log("URL :", url);
        console.log("FORMAT :", format);
        console.log("QUALITY :", quality);
        console.log("");


        try {

            await runCommand(
                YTDLP,
                args
            );


            var files =
                fs.readdirSync(
                    DOWNLOAD_DIR
                );


            var filename =
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


            var filePath =
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


            res.status(500).send(
                error.message
            );

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
            "Serveur : http://localhost:" +
            PORT
        );

    }
);
