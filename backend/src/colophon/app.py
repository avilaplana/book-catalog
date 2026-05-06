from fastapi import FastAPI

app = FastAPI()


@app.get("/v1/health")
def health():
    return {"status": "ok"}
