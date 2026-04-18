import docx
import sys

try:
    doc = docx.Document(r'C:\Users\PC\Downloads\TMDT\Website quản lý kho vận - Report 1 - Research thực tế.docx')
    with open('Website_report.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join([p.text for p in doc.paragraphs]))
except Exception as e:
    print(e)
