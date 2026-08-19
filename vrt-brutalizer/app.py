from flask import Flask, render_template, request, jsonify

from vrt import parse_vrt

app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

corpus = None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload():
    global corpus

    if "file" not in request.files:
        return jsonify({
            "error": "No file uploaded"
        }), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({
            "error": "No file selected"
        }), 400

    if not uploaded_file.filename.lower().endswith(".vrt"):
        return jsonify({
            "error": "Only VRT files are supported"
        }), 400

    try:
        content = uploaded_file.read().decode("utf-8")
        corpus = parse_vrt(content)

    except UnicodeDecodeError:
        return jsonify({
            "error": "The file is not valid UTF-8"
        }), 400

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    return jsonify({
        "filename": uploaded_file.filename,
        "sentence_count": len(corpus.sentences),
    })


@app.route("/api/sentence/<int:index>")
def get_sentence(index):
    if corpus is None:
        return jsonify({
            "error": "No corpus loaded"
        }), 400

    if index < 0 or index >= len(corpus.sentences):
        return jsonify({
            "error": "Sentence index out of range"
        }), 404

    return jsonify(
        corpus.sentences[index].to_dict()
    )


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )