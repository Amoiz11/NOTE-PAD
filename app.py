from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import os
import uuid
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

if not os.path.exists('data'):
    os.makedirs('data')

def init_data_files():
    files = {
        'data/notes.json': {},
        'data/users.json': {},
        'data/trash.json': {},
        'data/archive.json': {}
    }
    for filepath, default_data in files.items():
        if not os.path.exists(filepath):
            with open(filepath, 'w') as f:
                json.dump(default_data, f)

init_data_files()

def load_data(filename):
    try:
        with open(f'data/{filename}', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading {filename}: {e}")
        return {}

def save_data(filename, data):
    with open(f'data/{filename}', 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('notes'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        users = load_data('users.json')
        
        for user_id, user_data in users.items():
            if user_data['email'] == email:
                session['user_id'] = user_id
                session['user_name'] = user_data['name']
                return redirect(url_for('notes'))
        
        user_id = str(uuid.uuid4())
        users[user_id] = {
            'name': email.split('@')[0],
            'email': email,
            'created_at': datetime.now().isoformat()
        }
        save_data('users.json', users)
        
        session['user_id'] = user_id
        session['user_name'] = users[user_id]['name']
        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/notes')
def notes():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    notes_data = load_data('notes.json')
    user_notes = []
    
    for note_id, note in notes_data.items():
        if note['user_id'] == session['user_id'] and not note.get('archived', False):
            user_notes.append({
                'id': note_id,
                'title': note['title'],
                'content': note['content'],
                'pinned': note.get('pinned', False),
                'archived': note.get('archived', False),
                'created_at': note['created_at'],
                'updated_at': note.get('updated_at', note['created_at'])
            })
    
    user_notes.sort(key=lambda x: (not x['pinned'], x['updated_at']), reverse=True)
    
    return render_template('notes.html', notes=user_notes, user_name=session['user_name'])

@app.route('/create_note', methods=['POST'])
def create_note():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.get_json()
    note_id = str(uuid.uuid4())
    
    notes = load_data('notes.json')
    notes[note_id] = {
        'user_id': session['user_id'],
        'title': data.get('title', 'Untitled Note'),
        'content': data.get('content', ''),
        'pinned': False,
        'archived': False,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    save_data('notes.json', notes)
    return jsonify({'success': True, 'note_id': note_id})

@app.route('/edit_note/<note_id>')
def edit_note(note_id):
    notes = load_data('notes.json')
    note = notes.get(note_id)
    
    if not note or note['user_id'] != session['user_id']:
        return redirect(url_for('notes'))
    
    return render_template('editor.html', note=note, note_id=note_id)

@app.route('/update_note/<note_id>', methods=['POST'])
def update_note(note_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    notes = load_data('notes.json')
    if note_id not in notes or notes[note_id]['user_id'] != session['user_id']:
        return jsonify({'error': 'Note not found'}), 404
    
    data = request.get_json()
    notes[note_id]['title'] = data.get('title', notes[note_id]['title'])
    notes[note_id]['content'] = data.get('content', notes[note_id]['content'])
    notes[note_id]['updated_at'] = datetime.now().isoformat()
    
    save_data('notes.json', notes)
    return jsonify({'success': True})

@app.route('/toggle_pin/<note_id>', methods=['POST'])
def toggle_pin(note_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    notes = load_data('notes.json')
    if note_id not in notes or notes[note_id]['user_id'] != session['user_id']:
        return jsonify({'error': 'Note not found'}), 404
    
    notes[note_id]['pinned'] = not notes[note_id].get('pinned', False)
    save_data('notes.json', notes)
    
    return jsonify({'success': True, 'pinned': notes[note_id]['pinned']})

@app.route('/toggle_archive/<note_id>', methods=['POST'])
def toggle_archive(note_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    notes = load_data('notes.json')
    if note_id not in notes or notes[note_id]['user_id'] != session['user_id']:
        return jsonify({'error': 'Note not found'}), 404
    
    notes[note_id]['archived'] = not notes[note_id].get('archived', False)
    notes[note_id]['updated_at'] = datetime.now().isoformat()
    
    save_data('notes.json', notes)
    return jsonify({'success': True, 'archived': notes[note_id]['archived']})

@app.route('/archive')
def archive():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    notes_data = load_data('notes.json')
    archived_notes = []
    
    for note_id, note in notes_data.items():
        if note['user_id'] == session['user_id'] and note.get('archived', False):
            archived_notes.append({
                'id': note_id,
                'title': note['title'],
                'content': note['content'],
                'pinned': note.get('pinned', False),
                'archived': note.get('archived', False),
                'created_at': note['created_at'],
                'updated_at': note.get('updated_at', note['created_at'])
            })
    
    archived_notes.sort(key=lambda x: x['updated_at'], reverse=True)
    
    return render_template('archive.html', archived_notes=archived_notes, user_name=session['user_name'])

@app.route('/delete_note/<note_id>', methods=['POST'])
def delete_note(note_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    notes = load_data('notes.json')
    trash = load_data('trash.json')
    
    if note_id not in notes or notes[note_id]['user_id'] != session['user_id']:
        return jsonify({'error': 'Note not found'}), 404
    
    trash[note_id] = notes[note_id]
    trash[note_id]['deleted_at'] = datetime.now().isoformat()
    
    del notes[note_id]
    
    save_data('notes.json', notes)
    save_data('trash.json', trash)
    
    return jsonify({'success': True})

@app.route('/trash')
def trash():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    trash_data = load_data('trash.json')
    user_trash = []
    
    for note_id, note in trash_data.items():
        if note['user_id'] == session['user_id']:
 
            deleted_at = datetime.fromisoformat(note['deleted_at'])
            if datetime.now() - deleted_at > timedelta(days=30):

                del trash_data[note_id]
                continue
            
            user_trash.append({
                'id': note_id,
                'title': note['title'],
                'content': note['content'],
                'deleted_at': note['deleted_at']
            })
    
    save_data('trash.json', trash_data)
    return render_template('trash.html', trash_notes=user_trash)

@app.route('/restore_note/<note_id>', methods=['POST'])
def restore_note(note_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    notes = load_data('notes.json')
    trash = load_data('trash.json')
    
    if note_id not in trash or trash[note_id]['user_id'] != session['user_id']:
        return jsonify({'error': 'Note not found'}), 404
   
    notes[note_id] = trash[note_id]
    del trash[note_id]
    
    save_data('notes.json', notes)
    save_data('trash.json', trash)
    
    return jsonify({'success': True})

@app.route('/permanent_delete/<note_id>', methods=['POST'])
def permanent_delete(note_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    trash = load_data('trash.json')
    
    if note_id not in trash or trash[note_id]['user_id'] != session['user_id']:
        return jsonify({'error': 'Note not found'}), 404
    
    del trash[note_id]
    save_data('trash.json', trash)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)