from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
import os
from pdf2docx import Converter
import uuid
import time
import glob

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['CONVERTED_FOLDER'] = 'converted'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Create directories if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['CONVERTED_FOLDER'], exist_ok=True)

def allowed_file(filename):
    """Check if the file has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

class PDFToWordConverter:
    """Convert PDF files to Word documents"""
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
    
    def convert(self, output_path):
        """Convert PDF to DOCX"""
        try:
            converter = Converter(self.pdf_path)
            converter.convert(output_path, start=0, end=None)
            converter.close()
            return True, output_path
        except Exception as e:
            return False, str(e)

@app.route('/')
def index():
    
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert_pdf():
    """Handle PDF conversion"""
    try:
        # Check if file was uploaded
        if 'pdf_file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file uploaded'
            })
        
        file = request.files['pdf_file']
        
        # Check if file was selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            })
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Only PDF files are allowed'
            })
        
       
        unique_id = str(uuid.uuid4())[:8]
        original_filename = secure_filename(file.filename)
        base_name = os.path.splitext(original_filename)[0]
        
        pdf_filename = f"{base_name}_{unique_id}.pdf"
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
        file.save(pdf_path)
        
       
        output_filename = f"{base_name}_{unique_id}_converted.docx"
        output_path = os.path.join(app.config['CONVERTED_FOLDER'], output_filename)
        
      
        converter = PDFToWordConverter(pdf_path)
        success, result = converter.convert(output_path)
        
        if success:
          
            try:
                os.remove(pdf_path)
            except:
                pass
            
            return jsonify({
                'success': True,
                'message': 'Conversion successful!',
                'download_url': f'/download/{output_filename}',
                'filename': output_filename
            })
        else:
            
            try:
                os.remove(pdf_path)
            except:
                pass
            
            return jsonify({
                'success': False,
                'message': f'Conversion failed: {result}'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        })

@app.route('/download/<filename>')
def download_file(filename):
    """Serve converted files for download"""
    try:
        file_path = os.path.join(app.config['CONVERTED_FOLDER'], filename)
        
      
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': 'File not found'
            }), 404
        
        
        cleanup_old_files()
        
       
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Download error: {str(e)}'
        }), 500

def cleanup_old_files():
    """Clean up files older than 1 hour"""
    current_time = time.time()
    one_hour_ago = current_time - 3600  
    
    for folder in [app.config['CONVERTED_FOLDER'], app.config['UPLOAD_FOLDER']]:
        for file_path in glob.glob(os.path.join(folder, '*')):
            try:
                if os.path.getmtime(file_path) < one_hour_ago:
                    os.remove(file_path)
            except:
                pass

@app.route('/cleanup', methods=['POST'])
def manual_cleanup():
    """Manual cleanup endpoint"""
    try:
        cleanup_old_files()
        return jsonify({
            'success': True,
            'message': 'Cleanup completed'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Cleanup failed: {str(e)}'
        })

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'PDF to Word Converter'
    })

if __name__ == '__main__':
  
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(host=host, port=port, debug=debug)