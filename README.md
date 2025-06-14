# Retro Football Online

A web-based version of the retro football game, converted from Pygame to JavaScript.

## How to Run Locally

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the Flask application:
   ```
   python app.py
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Game Controls

- **Arrow Keys**: Move the active player
- **Number Keys (1-3)**: Select receivers
- **Space**: Start game, throw ball, continue after play
- **ESC**: Cancel pass selection

## Deploying Online

This application can be deployed to various platforms:

### Heroku
```
heroku create retro-football
git push heroku main
```

### AWS Elastic Beanstalk
```
eb init
eb create retro-football-env
eb deploy
```

### Render, Vercel, or Netlify
Upload the code and follow the platform's deployment instructions.

## Game Features

- Classic retro football gameplay
- Multiple play types: Run, Short Pass, Long Pass, Option
- Realistic football mechanics
- Scoreboard with time, downs, and score tracking
- Mobile-friendly controls

## Credits

© 2025 Retro Games
