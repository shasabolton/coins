# coins

Investing game
A coin drops into purse every P = 5s = payrate
The coins shrinks and disappears in D= 1*P = deprecation.

Coins can be dragged into a robot characters mouth who can visibly hold F=4= feedrate stacked in his tummy. The robot starts with S=3=start coins in his tummy. Only the bottom coin in the stack shrinks. When it is gone, the stack drops down to fill the space. When all coins have disappeared in his tummy he dies and the game is over. So the robot can live F*D*P seconds without more food when full.

Coins can be dragged into a savings bank. Here they visibly mitosis split as soon as they enter, and finish becoming 2 counted coins after I = 4*P = interest rate

Coins can also be dragged into a present box with wrapped presents. When a coin is dragged over a present, it unwraps to reveal an emoji. The are G = 9 presents = gross domestic product.

There are only L= 10 coins = lifetime in a game. 

The goal of the game is to open all presents without dying or coming to the end of life.

The game starts with S coins in the robot and one coin appearing in the purse. If you don't feed the robot first, he will die and the game will be over. You must then focus on keeping the robot alive while also investing coins in the bank so they can multiply. You then buy presents using coins from the bank. The point of the game is to teach kids to interpret that the value of a coin is not its spending power. It is its ability to produce passive income.

Static mode can be enabled in settings. In static mode P is set to 1 second and the game starts paused with one coin in the purse. Dragging a coin into a different box advances the game by one P, so shrink and split progress is counted in moves instead of real seconds. Particles keep floating while game time is paused.

Layout
Vertical phone screen.
Top third is presents.
Middle left is the purse.
Bottom left is the robot.
Middle and bottom right is the bank.

Make this app using vanila js client side only. The numbers can be altered with presets for easy, medium and hard game play. And can also be set manually for experimentation. This is done in a pop up when a settings button is pressed. There is also a new game button. These 2 buttons are at the bottom of the screen in a one row pannel.

## Running the app

Open `index.html` in a browser, or serve the folder with any static file server, for example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
