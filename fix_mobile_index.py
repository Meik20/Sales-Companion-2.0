import shutil, os

FILE = os.path.join('mobile', 'index.html')
shutil.copy2(FILE, FILE + '.bak')

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: balise orpheline
content = content.replace('    <div\n    <div id="register-form"', '    <div id="register-form"')

# Fix 2: fonction dupliquee
bad = 'async function submitAssignmentMobile() {\n  var assignee = document\nasync function submitAssignmentMobile()'
good = 'async function submitAssignmentMobile()'
content = content.replace(bad, good)

# Fix 3: dollar echappe dans fmtChat
content = content.replace('\\' + '$1', '$1')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('Corrections appliquees !')