from flask import Flask


def create_app(test_config=None):
    app = Flask(__name__, static_folder="docs", static_url_path="")
    if test_config:
        app.config.update(test_config)

    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=False)
