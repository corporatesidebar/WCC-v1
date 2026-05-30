# Deployment Notes

Deploy frontend and backend as the current WCC V1.2 patch.

Do not include Python cache files. This package excludes:

- backend/__pycache__/
- backend/__pycache__/main.cpython-313.pyc

Backend version: wcc-v1.2.4-qa-fix-batch-4

Frontend still defaults to:

https://executive-engine-os.onrender.com

Override with `window.WCC_API_BASE` or localStorage key `WCC_API_BASE` if needed.
