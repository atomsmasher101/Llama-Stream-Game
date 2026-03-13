Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut(WshShell.SpecialFolders("Startup") & "\LlamaAI.lnk")
shortcut.TargetPath = "C:\Windows\System32\cmd.exe"
shortcut.Arguments = "/c cd /d C:\Users\littl\Llama Game NN\server && start /b node server.js"
shortcut.WorkingDirectory = "C:\Users\littl\Llama Game NN\server"
shortcut.WindowStyle = 7
shortcut.Save
