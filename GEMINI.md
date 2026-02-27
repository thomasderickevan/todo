# Instructions for Gemini CLI

- **Automated Deployments:** After every successful code modification and a successful `npm run build`, you MUST attempt to push the changes to GitHub.
- **Git Path:** C:\Users\evan\AppData\Local\Programs\Git\cmd\git.exe
- **Standard Workflow:**
  1. `C:\Users\evan\AppData\Local\Programs\Git\cmd\git.exe add .`
  2. `C:\Users\evan\AppData\Local\Programs\Git\cmd\git.exe commit -m "Automated update: [Brief description of change]"`
  3. `C:\Users\evan\AppData\Local\Programs\Git\cmd\git.exe push`
- **Confirmation:** If a `git push` fails due to authentication, briefly inform the user and provide the direct command they should run to fix it.
