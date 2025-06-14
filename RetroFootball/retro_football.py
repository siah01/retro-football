import pygame
import sys
import random
import math
from enum import Enum

# Initialize pygame
pygame.init()

# Game constants
SCREEN_WIDTH = 1160  # Increased to accommodate wider end zones
SCREEN_HEIGHT = 600
FIELD_WIDTH = 1000  # Reduced by 50% from 2000
FIELD_HEIGHT = 500
END_ZONE_WIDTH = 60  # Doubled from 30
YARD_LENGTH = 10  # Reduced by 50% from 20 pixels per yard
PLAYER_SIZE = 14  # Increased from 10 to make players larger
BALL_SIZE = 5  # Adjusted for smaller field
GAME_SPEED = 60  # FPS

# Colors
GREEN = (30, 120, 30)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
YELLOW = (255, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
BROWN = (139, 69, 19)
END_ZONE_RED = (180, 0, 0)  # Red color for end zones

# Game states
class GameState(Enum):
    TITLE_SCREEN = 0
    PLAY_SELECTION = 1
    PLAYING = 2
    PASS_SELECTION = 3
    BALL_IN_AIR = 4
    PLAY_OVER = 5

# Play types
class PlayType(Enum):
    RUN = 1
    SHORT_PASS = 2
    LONG_PASS = 3
    OPTION = 4

class Player:
    def __init__(self, x, y, color, is_qb=False, is_receiver=False, is_defender=False, route=None):
        self.x = x
        self.y = y
        self.color = color
        self.speed = 2  # Reduced speed for smaller field
        self.is_qb = is_qb
        self.is_receiver = is_receiver
        self.is_defender = is_defender
        self.has_ball = is_qb
        self.route = route
        self.route_step = 0
        self.width = PLAYER_SIZE
        self.height = PLAYER_SIZE
        self.target_x = x
        self.target_y = y
        self.number = 0
        self.selected = False

    def draw(self, screen):
        pygame.draw.rect(screen, self.color, (self.x - self.width//2, self.y - self.height//2, self.width, self.height))

        # Draw player number if it's a receiver
        if self.is_receiver:
            font = pygame.font.SysFont(None, 14)  # Smaller font for smaller players
            text = font.render(str(self.number), True, BLACK)
            screen.blit(text, (self.x - 3, self.y - 5))

        # Highlight selected receiver
        if self.selected:
            pygame.draw.rect(screen, YELLOW, (self.x - self.width//2, self.y - self.height//2, self.width, self.height), 1)

    def move(self, dx, dy):
        self.x += dx
        self.y += dy

    def follow_route(self):
        if self.route and self.route_step < len(self.route):
            target_x, target_y = self.route[self.route_step]

            dx = target_x - self.x
            dy = target_y - self.y
            distance = math.sqrt(dx**2 + dy**2)

            if distance < self.speed:
                self.x = target_x
                self.y = target_y
                self.route_step += 1
            else:
                self.x += (dx / distance) * self.speed
                self.y += (dy / distance) * self.speed

    def chase_ball(self, ball_x, ball_y):
        if self.is_defender:
            dx = ball_x - self.x
            dy = ball_y - self.y
            distance = math.sqrt(dx**2 + dy**2)

            if distance > 0:
                self.x += (dx / distance) * (self.speed * 0.7)  # Defenders are slightly slower
                self.y += (dy / distance) * (self.speed * 0.7)

class Ball:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = BALL_SIZE
        self.height = BALL_SIZE
        self.in_air = False
        self.target_x = 0
        self.target_y = 0
        self.speed = 5  # Reduced speed for smaller field
        self.air_time = 0
        self.max_air_time = 20  # Reduced for smaller field
        self.carrier = None

    def draw(self, screen):
        pygame.draw.ellipse(screen, BROWN, (self.x - self.width//2, self.y - self.height//2, self.width, self.height))

    def throw(self, target_x, target_y):
        self.in_air = True
        self.target_x = target_x
        self.target_y = target_y
        self.air_time = 0

    def update_in_air(self):
        if self.in_air:
            self.air_time += 1
            progress = self.air_time / self.max_air_time

            if progress >= 1:
                self.x = self.target_x
                self.y = self.target_y
                self.in_air = False
                return

            # Parabolic arc for the ball
            self.x = self.x + (self.target_x - self.x) * (progress)

            # Add a vertical arc to the ball's flight
            start_y = self.y
            direct_y = start_y + (self.target_y - start_y) * progress
            arc_height = -25  # Reduced for smaller field
            arc_y = arc_height * math.sin(progress * math.pi)
            self.y = direct_y + arc_y

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Retro Football")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont(None, 36)
        self.small_font = pygame.font.SysFont(None, 24)
        self.large_font = pygame.font.SysFont(None, 72)
        
        # Start at title screen
        self.state = GameState.TITLE_SCREEN
        self.play_type = None

        # Field positions - centered on screen with wider end zones
        self.field_x = (SCREEN_WIDTH - FIELD_WIDTH - 2 * END_ZONE_WIDTH) // 2 + END_ZONE_WIDTH
        self.field_y = (SCREEN_HEIGHT - FIELD_HEIGHT) // 2
        
        # Notification system
        self.notification = ""
        self.notification_time = 0
        self.notification_duration = 60  # frames (1 second at 60 FPS)

        self.reset_game()

    def reset_game(self):
        # Game state
        self.score = 0
        self.opponent_score = 0
        self.quarter = 1
        self.time = 15 * 60  # 15 minutes in seconds
        self.down = 1
        self.distance = 10
        self.yard_line = 20
        self.first_down_line = self.yard_line + self.distance
        
        # Reset notification
        self.notification = ""
        self.notification_time = 0

        # Field positions - already set in __init__
        self.field_x = (SCREEN_WIDTH - FIELD_WIDTH - 2 * END_ZONE_WIDTH) // 2 + END_ZONE_WIDTH
        self.field_y = (SCREEN_HEIGHT - FIELD_HEIGHT) // 2

        # Initialize players and ball for title screen
        self.players = []
        self.receivers = []
        self.defenders = []
        self.ball = Ball(self.field_x + (50 * YARD_LENGTH), self.field_y + (FIELD_HEIGHT // 2))
        
        # Reset for new play
        if self.state != GameState.TITLE_SCREEN:
            self.reset_play()

    def reset_play(self):
        # Players
        self.players = []

        # Create QB
        qb_x = self.field_x + (self.yard_line * YARD_LENGTH)
        qb_y = self.field_y + (FIELD_HEIGHT // 2)
        self.qb = Player(qb_x, qb_y, BLUE, is_qb=True)
        self.players.append(self.qb)

        # Create receivers based on play type
        self.receivers = []
        if self.play_type == PlayType.RUN:
            self.create_run_play()
        elif self.play_type == PlayType.SHORT_PASS:
            self.create_short_pass_play()
        elif self.play_type == PlayType.LONG_PASS:
            self.create_long_pass_play()
        elif self.play_type == PlayType.OPTION:
            self.create_option_play()
        else:
            # Default to short pass if no play selected
            self.create_short_pass_play()

        # Create defenders - adjusted for smaller field
        self.defenders = []
        for _ in range(5):
            def_x = qb_x + random.randint(25, 75)
            def_y = self.field_y + random.randint(50, FIELD_HEIGHT - 50)
            defender = Player(def_x, def_y, RED, is_defender=True)
            self.defenders.append(defender)
            self.players.append(defender)

        # Create ball
        self.ball = Ball(qb_x, qb_y)
        self.ball.carrier = self.qb

        # Game state
        self.state = GameState.PLAYING
        self.play_over = False
        self.play_result = ""
        self.selected_receiver = None

    def create_run_play(self):
        qb_x = self.qb.x
        qb_y = self.qb.y

        # Create running back - adjusted for smaller field
        rb_route = [
            (qb_x - 15, qb_y + 10),  # Move back for handoff
            (qb_x + 50, qb_y + 10),  # Run forward
            (qb_x + 100, qb_y)       # Cut upfield
        ]
        rb = Player(qb_x, qb_y + 15, BLUE, is_receiver=True, route=rb_route)
        rb.number = 1
        self.receivers.append(rb)
        self.players.append(rb)

        # Add blockers
        blocker1 = Player(qb_x + 10, qb_y - 15, BLUE)
        blocker2 = Player(qb_x + 10, qb_y + 15, BLUE)
        self.players.append(blocker1)
        self.players.append(blocker2)

    def create_short_pass_play(self):
        qb_x = self.qb.x
        qb_y = self.qb.y

        # Create 3 receivers with short routes - adjusted for smaller field
        routes = [
            [(qb_x + 40, qb_y - 40), (qb_x + 60, qb_y - 50)],  # Slant route
            [(qb_x + 50, qb_y), (qb_x + 75, qb_y + 10)],       # Out route
            [(qb_x + 25, qb_y + 40), (qb_x + 60, qb_y + 30)]   # Curl route
        ]

        positions = [
            (qb_x, qb_y - 30),  # Wide receiver left
            (qb_x + 10, qb_y),  # Tight end
            (qb_x, qb_y + 30)   # Wide receiver right
        ]

        for i in range(3):
            receiver = Player(positions[i][0], positions[i][1], BLUE, is_receiver=True, route=routes[i])
            receiver.number = i + 1
            self.receivers.append(receiver)
            self.players.append(receiver)

    def create_long_pass_play(self):
        qb_x = self.qb.x
        qb_y = self.qb.y

        # Create 3 receivers with long routes - adjusted for smaller field
        routes = [
            [(qb_x + 50, qb_y - 50), (qb_x + 100, qb_y - 60)],  # Deep left
            [(qb_x + 75, qb_y), (qb_x + 125, qb_y)],            # Deep middle
            [(qb_x + 50, qb_y + 50), (qb_x + 100, qb_y + 60)]   # Deep right
        ]

        positions = [
            (qb_x, qb_y - 30),  # Wide receiver left
            (qb_x + 10, qb_y),  # Tight end
            (qb_x, qb_y + 30)   # Wide receiver right
        ]

        for i in range(3):
            receiver = Player(positions[i][0], positions[i][1], BLUE, is_receiver=True, route=routes[i])
            receiver.number = i + 1
            self.receivers.append(receiver)
            self.players.append(receiver)

    def create_option_play(self):
        qb_x = self.qb.x
        qb_y = self.qb.y

        # Create running back for option - adjusted for smaller field
        rb_route = [
            (qb_x + 15, qb_y + 15),   # Move to option position
            (qb_x + 75, qb_y + 15)    # Run forward if pitched
        ]
        rb = Player(qb_x, qb_y + 15, BLUE, is_receiver=True, route=rb_route)
        rb.number = 1
        self.receivers.append(rb)
        self.players.append(rb)

        # Add a couple of receivers for passing option
        wr_route = [(qb_x + 50, qb_y - 40), (qb_x + 90, qb_y - 50)]
        wr = Player(qb_x, qb_y - 25, BLUE, is_receiver=True, route=wr_route)
        wr.number = 2
        self.receivers.append(wr)
        self.players.append(wr)

        te_route = [(qb_x + 40, qb_y), (qb_x + 75, qb_y - 10)]
        te = Player(qb_x + 10, qb_y, BLUE, is_receiver=True, route=te_route)
        te.number = 3
        self.receivers.append(te)
        self.players.append(te)

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if self.state == GameState.TITLE_SCREEN:
                    if event.key == pygame.K_SPACE:
                        self.state = GameState.PLAY_SELECTION
                
                elif self.state == GameState.PLAY_SELECTION:
                    if event.key == pygame.K_1:
                        self.play_type = PlayType.RUN
                        self.reset_play()
                    elif event.key == pygame.K_2:
                        self.play_type = PlayType.SHORT_PASS
                        self.reset_play()
                    elif event.key == pygame.K_3:
                        self.play_type = PlayType.LONG_PASS
                        self.reset_play()
                    elif event.key == pygame.K_4:
                        self.play_type = PlayType.OPTION
                        self.reset_play()

                elif self.state == GameState.PLAYING:
                    # Throw to receiver using number keys
                    if event.key in [pygame.K_1, pygame.K_2, pygame.K_3]:
                        receiver_num = event.key - pygame.K_1 + 1
                        for receiver in self.receivers:
                            if receiver.number == receiver_num:
                                self.selected_receiver = receiver
                                receiver.selected = True
                                self.state = GameState.PASS_SELECTION
                                break

                elif self.state == GameState.PASS_SELECTION:
                    if event.key == pygame.K_SPACE:
                        if self.selected_receiver:
                            # Throw the ball
                            self.ball.throw(self.selected_receiver.x, self.selected_receiver.y)
                            self.ball.carrier = None
                            self.state = GameState.BALL_IN_AIR

                    elif event.key == pygame.K_ESCAPE:
                        # Cancel pass
                        if self.selected_receiver:
                            self.selected_receiver.selected = False
                            self.selected_receiver = None
                        self.state = GameState.PLAYING

                elif self.state == GameState.PLAY_OVER:
                    if event.key == pygame.K_SPACE:
                        self.state = GameState.PLAY_SELECTION

    def update(self):
        keys = pygame.key.get_pressed()

        # Update notification timer
        if self.notification:
            self.notification_time -= 1
            if self.notification_time <= 0:
                self.notification = ""

        if self.state == GameState.PLAYING:
            # Move active player with arrow keys
            active_player = self.qb if self.ball.carrier == self.qb else self.ball.carrier
            
            if active_player:
                dx, dy = 0, 0
                if keys[pygame.K_LEFT]:
                    dx = -active_player.speed
                if keys[pygame.K_RIGHT]:
                    dx = active_player.speed
                if keys[pygame.K_UP]:
                    dy = -active_player.speed
                if keys[pygame.K_DOWN]:
                    dy = active_player.speed

                active_player.move(dx, dy)

                # Keep player in bounds (including end zones)
                active_player.x = max(self.field_x - END_ZONE_WIDTH, min(active_player.x, self.field_x + FIELD_WIDTH + END_ZONE_WIDTH))
                active_player.y = max(self.field_y, min(active_player.y, self.field_y + FIELD_HEIGHT))

                # Update ball position with carrier
                self.ball.x = active_player.x
                self.ball.y = active_player.y

            # Move receivers along routes
            for receiver in self.receivers:
                receiver.follow_route()

            # Move defenders to chase the ball
            ball_carrier = self.ball.carrier
            target_x = self.ball.x
            target_y = self.ball.y

            if ball_carrier:
                target_x = ball_carrier.x
                target_y = ball_carrier.y

            for defender in self.defenders:
                defender.chase_ball(target_x, target_y)

            # Check for tackles
            if ball_carrier:
                for defender in self.defenders:
                    dx = defender.x - ball_carrier.x
                    dy = defender.y - ball_carrier.y
                    distance = math.sqrt(dx**2 + dy**2)

                    if distance < PLAYER_SIZE:
                        self.end_play("Tackled!")
                        break

            # Check if ball carrier crossed first down line
            if ball_carrier and ball_carrier.x >= self.field_x + (self.first_down_line * YARD_LENGTH):
                new_yards = (ball_carrier.x - (self.field_x + self.yard_line * YARD_LENGTH)) // YARD_LENGTH
                self.yard_line += new_yards
                self.down = 1
                self.distance = 10
                self.first_down_line = min(self.yard_line + self.distance, 100)
                # Show first down notification without ending play
                self.show_notification("First down!")

            # Check for touchdown
            if ball_carrier and ball_carrier.x >= self.field_x + (100 * YARD_LENGTH):
                self.score += 7  # Assume extra point is good
                self.end_play("Touchdown!")
                
                # Simulate opponent possession
                self.simulate_opponent_possession()
                
                # Reset for next possession
                self.yard_line = 20
                self.down = 1
                self.distance = 10
                self.first_down_line = self.yard_line + self.distance

        elif self.state == GameState.BALL_IN_AIR:
            # Update ball position
            self.ball.update_in_air()

            # Move receivers along routes
            for receiver in self.receivers:
                receiver.follow_route()

            # Move defenders
            for defender in self.defenders:
                defender.chase_ball(self.ball.x, self.ball.y)

            # Check if ball reached target
            if not self.ball.in_air:
                # Check if receiver caught the ball
                caught = False
                for receiver in self.receivers:
                    dx = receiver.x - self.ball.x
                    dy = receiver.y - self.ball.y
                    distance = math.sqrt(dx**2 + dy**2)

                    if distance < PLAYER_SIZE * 1.5:
                        self.ball.carrier = receiver
                        caught = True
                        
                        # Show notification about completed pass
                        self.show_notification(f"Pass complete to #{receiver.number}!")

                        # Deselect receiver
                        if self.selected_receiver:
                            self.selected_receiver.selected = False
                            self.selected_receiver = None

                        self.state = GameState.PLAYING
                        break

                # Check if defender intercepted
                if not caught:
                    for defender in self.defenders:
                        dx = defender.x - self.ball.x
                        dy = defender.y - self.ball.y
                        distance = math.sqrt(dx**2 + dy**2)

                        if distance < PLAYER_SIZE * 1.5:
                            self.end_play("Intercepted!")
                            return

                # Incomplete pass
                if not caught:
                    self.end_play("Incomplete pass!")

    def simulate_opponent_possession(self, starting_yard_line=20):
        """Simulate the opponent's possession with a random chance of scoring
        
        Args:
            starting_yard_line: The yard line where the opponent starts their possession
        """
        # Update game clock for opponent's possession
        time_used = random.randint(60, 180)  # 1-3 minutes
        self.time -= time_used
        
        # Check if time ran out during opponent possession
        if self.time <= 0:
            if self.quarter < 4:
                self.quarter += 1
                self.time = 15 * 60
                self.play_result += " Quarter ended during opponent possession."
            else:
                self.play_result = "Game Over!"
                return
        
        # Calculate scoring probability based on field position
        # Better field position (higher yard line) means better chance of scoring
        base_scoring_chance = 0.3  # 30% chance from own 20
        field_position_bonus = starting_yard_line / 100  # 0 to 1 based on field position
        scoring_chance = base_scoring_chance + (field_position_bonus * 0.4)  # Max 70% from opponent's 20
        
        # Determine drive outcome
        if random.random() < scoring_chance:
            # Opponent scored a touchdown
            self.opponent_score += 7  # Assume extra point is good
            self.play_result += " Opponent drove down the field and scored a touchdown!"
        else:
            # Opponent didn't score - determine how the drive ended
            drive_outcomes = [
                "Opponent punted after going three-and-out!",
                "Opponent drove to midfield but had to punt!",
                "Opponent missed a long field goal attempt!",
                "Opponent turned over on downs in your territory!",
                "Your defense forced a fumble!"
            ]
            # Weight outcomes based on field position
            if starting_yard_line < 40:  # Bad field position
                outcome_weights = [0.5, 0.3, 0.1, 0.05, 0.05]
            elif starting_yard_line < 70:  # Midfield area
                outcome_weights = [0.2, 0.4, 0.2, 0.1, 0.1]
            else:  # Good field position
                outcome_weights = [0.1, 0.2, 0.3, 0.2, 0.2]
                
            outcome_index = random.choices(range(len(drive_outcomes)), weights=outcome_weights)[0]
            self.play_result += f" {drive_outcomes[outcome_index]}"

    def end_play(self, result):
        self.play_result = result
        self.state = GameState.PLAY_OVER

        if result == "Tackled!":
            # Calculate yards gained
            new_yards = (self.ball.x - (self.field_x + self.yard_line * YARD_LENGTH)) // YARD_LENGTH
            self.yard_line += new_yards
            self.down += 1
            self.distance -= new_yards

            if self.down > 4:
                self.play_result = "Turnover on downs!"
                # Calculate field position for opponent based on current yard line
                opponent_yard_line = 100 - self.yard_line
                # Simulate opponent possession after turnover on downs
                self.simulate_opponent_possession(opponent_yard_line)
                # Reset for next possession
                self.yard_line = 20
                self.down = 1
                self.distance = 10

            self.first_down_line = min(self.yard_line + self.distance, 100)

        elif result == "Incomplete pass!":
            self.down += 1

            if self.down > 4:
                self.play_result = "Turnover on downs!"
                # Calculate field position for opponent based on current yard line
                opponent_yard_line = 100 - self.yard_line
                # Simulate opponent possession after turnover on downs
                self.simulate_opponent_possession(opponent_yard_line)
                # Reset for next possession
                self.yard_line = 20
                self.down = 1
                self.distance = 10

            self.first_down_line = min(self.yard_line + self.distance, 100)

        elif result == "Intercepted!":
            # Simulate opponent possession after interception
            # Assume interception happens around midfield
            self.simulate_opponent_possession(50)
            # Reset for next possession
            self.yard_line = 20
            self.down = 1
            self.distance = 10
            self.first_down_line = self.yard_line + self.distance

        # Update game clock
        self.time -= random.randint(25, 40)
        if self.time <= 0:
            if self.quarter < 4:
                self.quarter += 1
                self.time = 15 * 60
            else:
                self.play_result = "Game Over!"

    def show_notification(self, message):
        """Display a temporary notification without stopping gameplay"""
        self.notification = message
        self.notification_time = self.notification_duration
        
    def draw_notification(self):
        """Draw the current notification on screen"""
        # Create semi-transparent background for notification
        overlay = pygame.Surface((SCREEN_WIDTH, 40), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 150))
        self.screen.blit(overlay, (0, 100))
        
        # Draw notification text
        text = self.font.render(self.notification, True, YELLOW)
        self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, 110))

    def draw(self):
        self.screen.fill(BLACK)

        if self.state == GameState.TITLE_SCREEN:
            self.draw_title_screen()
        else:
            # Draw field
            pygame.draw.rect(self.screen, GREEN, (self.field_x, self.field_y, FIELD_WIDTH, FIELD_HEIGHT))
            
            # Draw end zones (red)
            pygame.draw.rect(self.screen, END_ZONE_RED, 
                            (self.field_x - END_ZONE_WIDTH, self.field_y, END_ZONE_WIDTH, FIELD_HEIGHT))
            pygame.draw.rect(self.screen, END_ZONE_RED, 
                            (self.field_x + FIELD_WIDTH, self.field_y, END_ZONE_WIDTH, FIELD_HEIGHT))

            # Draw yard lines
            for i in range(0, 101, 10):
                x = self.field_x + (i * YARD_LENGTH)
                pygame.draw.line(self.screen, WHITE, (x, self.field_y), (x, self.field_y + FIELD_HEIGHT), 1)

                if i > 0 and i < 100 and i % 20 == 0:  # Only show every 20 yards to reduce clutter
                    text = self.small_font.render(str(i), True, WHITE)
                    self.screen.blit(text, (x - 5, self.field_y + 5))
                    self.screen.blit(text, (x - 5, self.field_y + FIELD_HEIGHT - 20))

            # Draw first down line
            first_down_x = self.field_x + (self.first_down_line * YARD_LENGTH)
            pygame.draw.line(self.screen, YELLOW, (first_down_x, self.field_y),
                             (first_down_x, self.field_y + FIELD_HEIGHT), 2)

            # Draw players
            for player in self.players:
                player.draw(self.screen)

            # Draw ball
            self.ball.draw(self.screen)

            # Draw scoreboard
            self.draw_scoreboard()

            # Draw notification if active
            if self.notification:
                self.draw_notification()

            # Draw play selection menu
            if self.state == GameState.PLAY_SELECTION:
                self.draw_play_selection()

            # Draw play result
            if self.state == GameState.PLAY_OVER:
                text = self.font.render(self.play_result, True, WHITE)
                self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, SCREEN_HEIGHT // 2))

                prompt = self.small_font.render("Press SPACE to continue", True, WHITE)
                self.screen.blit(prompt, (SCREEN_WIDTH // 2 - prompt.get_width() // 2, SCREEN_HEIGHT // 2 + 40))

            # Draw pass instructions
            if self.state == GameState.PASS_SELECTION:
                text = self.small_font.render("Press SPACE to throw or ESC to cancel", True, WHITE)
                self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, SCREEN_HEIGHT - 30))

        pygame.display.flip()

    def draw_scoreboard(self):
        # Draw scoreboard background
        pygame.draw.rect(self.screen, BLACK, (0, 0, SCREEN_WIDTH, 50))

        # Draw scores
        score_text = f"YOU: {self.score}  OPP: {self.opponent_score}"
        text = self.font.render(score_text, True, WHITE)
        self.screen.blit(text, (20, 10))

        # Draw down and distance
        down_text = f"{self.down}{self.get_down_suffix(self.down)} & {self.distance}"
        text = self.font.render(down_text, True, WHITE)
        self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, 10))

        # Draw time
        minutes = self.time // 60
        seconds = self.time % 60
        time_text = f"Q{self.quarter} {minutes}:{seconds:02d}"
        text = self.font.render(time_text, True, WHITE)
        self.screen.blit(text, (SCREEN_WIDTH - text.get_width() - 20, 10))

        # Draw yard line indicator
        yard_text = f"Ball on: {self.yard_line} yard line"
        text = self.small_font.render(yard_text, True, WHITE)
        self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, 35))
        
        # Show active player indicator
        if self.state == GameState.PLAYING and self.ball.carrier:
            if self.ball.carrier == self.qb:
                player_text = "Controlling: QB"
            else:
                player_text = f"Controlling: Receiver #{self.ball.carrier.number}"
            text = self.small_font.render(player_text, True, YELLOW)
            self.screen.blit(text, (SCREEN_WIDTH - text.get_width() - 20, 35))

    def get_down_suffix(self, down):
        if down == 1:
            return "st"
        elif down == 2:
            return "nd"
        elif down == 3:
            return "rd"
        else:
            return "th"

    def draw_title_screen(self):
        # Draw background - football field
        pygame.draw.rect(self.screen, GREEN, (self.field_x, self.field_y, FIELD_WIDTH, FIELD_HEIGHT))
        
        # Draw end zones
        pygame.draw.rect(self.screen, END_ZONE_RED, 
                        (self.field_x - END_ZONE_WIDTH, self.field_y, END_ZONE_WIDTH, FIELD_HEIGHT))
        pygame.draw.rect(self.screen, END_ZONE_RED, 
                        (self.field_x + FIELD_WIDTH, self.field_y, END_ZONE_WIDTH, FIELD_HEIGHT))
        
        # Draw yard lines (simplified)
        for i in range(0, 101, 10):
            x = self.field_x + (i * YARD_LENGTH)
            pygame.draw.line(self.screen, WHITE, (x, self.field_y), (x, self.field_y + FIELD_HEIGHT), 1)
        
        # Draw title
        title_text = "RETRO FOOTBALL"
        title = self.large_font.render(title_text, True, WHITE)
        
        # Create shadow effect for title
        title_shadow = self.large_font.render(title_text, True, BLACK)
        self.screen.blit(title_shadow, (SCREEN_WIDTH // 2 - title.get_width() // 2 + 3, 103))
        self.screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 100))
        
        # Draw football graphic
        pygame.draw.ellipse(self.screen, BROWN, 
                           (SCREEN_WIDTH // 2 - 40, 200, 80, 50))
        
        # Draw laces
        for i in range(4):
            pygame.draw.line(self.screen, WHITE, 
                            (SCREEN_WIDTH // 2 - 10, 210 + i * 8), 
                            (SCREEN_WIDTH // 2 + 10, 210 + i * 8), 2)
        
        # Draw start prompt
        prompt_text = "Press SPACE to start"
        
        # Make the prompt blink
        if pygame.time.get_ticks() % 1000 < 700:  # Visible for 700ms, invisible for 300ms
            prompt = self.font.render(prompt_text, True, YELLOW)
            self.screen.blit(prompt, (SCREEN_WIDTH // 2 - prompt.get_width() // 2, 300))
        
        # Draw credits
        credits = self.small_font.render("© 2025 Retro Games", True, WHITE)
        self.screen.blit(credits, (SCREEN_WIDTH // 2 - credits.get_width() // 2, SCREEN_HEIGHT - 40))
        
        # Draw controls info
        controls = self.small_font.render("Use arrow keys to move, number keys to select plays/receivers", True, WHITE)
        self.screen.blit(controls, (SCREEN_WIDTH // 2 - controls.get_width() // 2, SCREEN_HEIGHT - 70))

    def draw_play_selection(self):
        # Draw semi-transparent overlay
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        self.screen.blit(overlay, (0, 0))

        # Draw play selection menu
        title = self.font.render("Select Play", True, WHITE)
        self.screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 150))

        plays = [
            "1. Run",
            "2. Short Pass",
            "3. Long Pass",
            "4. Option"
        ]

        for i, play in enumerate(plays):
            text = self.font.render(play, True, WHITE)
            self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, 200 + i * 40))

    def run(self):
        while True:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(GAME_SPEED)

if __name__ == "__main__":
    game = Game()
    game.run()
