enum Direction {
    Straight = 0,
    Up = 1,
    Down = -1
}
enum SpriteKind {
    Train,
    Passenger,
    TimeBox,
    StatusText
}

let platforms: tiles.Location[] = []
let passengerList: Sprite[] = []
let timeBox: Sprite = null
let isChangeTrack = 0
let doorsOpened = false
let lever = 0
let train: Sprite = null
let lever_text = ""
let speed_text = ""
let status_bar: Sprite = null
let right_bar: Sprite = null
let trainDirection = Direction.Straight
let trainSpeed = 50
let prevSpeed = trainSpeed
let targetSpeed = 50
let dx = 0
let dy = 0
let headTileX = 0
let headTileY = 0
let targetY = 0
let trackWidth = 16
let targetOffset = 70
let offset = 10
let status_bar_height = 20
let status_text_color = 1


train = sprites.create(assets.image`trainHead`, SpriteKind.Train)
train.setFlag(SpriteFlag.StayInScreen, false)

let trainOffset = 7
// highest z-index for train
train.z = 100
scene.setBackgroundImage(assets.image`grass`)
tiles.setCurrentTilemap(tilemap`level1`)
train.setPosition(20, 72)
targetY = train.y
//train.setVelocity(0, 0)
status_bar = sprites.create(image.create(200, 10), SpriteKind.StatusText)
status_bar.setPosition(100, 5)
status_bar.setFlag(SpriteFlag.RelativeToCamera, true)
right_bar = sprites.create(image.create(200, 10), SpriteKind.StatusText)
right_bar.setPosition(100, 110)
right_bar.setFlag(SpriteFlag.RelativeToCamera, true)
game.setGameOverEffect(false, effects.dissolve)
game.setGameOverMessage(false, "YOU CRASHED!")
game.setGameOverPlayable(false, music.melodyPlayable(music.bigCrash), false)
info.setBorderColor(8)
info.setFontColor(15)
update_status_display()
create_passengers()
create_timebox()
updateDxDy()


controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (trainSpeed == 0) {
        let openSound = music.createSoundEffect(WaveShape.Noise, 853, 1905, 181, 150, 1000, SoundExpressionEffect.Vibrato, InterpolationCurve.Logarithmic)
        music.play(openSound, music.PlaybackMode.InBackground)
        if (train.tileKindAt(TileDirection.Top, assets.tile`platform`)) {
            train.setImage(assets.image`trainOpenDoorsUp`)
            let_passengers_in()
            train.setImage(assets.image`train`)
        } else if (train.tileKindAt(TileDirection.Bottom, assets.tile`platform`)) {
            train.setImage(assets.image`trainOpenDoorsDown`)
            let_passengers_in()
            train.setImage(assets.image`train`)
        } else {
            train.sayText("Signal Failure", 2000, true)
        }
    }
    update_status_display()
})
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (trainSpeed != 0) {
        change_speed(0)
        let brake = music.createSoundEffect(WaveShape.Sawtooth, 200, 1, 150, 150, 20 * Math.abs(trainSpeed), SoundExpressionEffect.None, InterpolationCurve.Logarithmic)
        music.play(brake, music.PlaybackMode.UntilDone)
    }
})
controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    change_speed(-10)
})
controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    change_speed(10)
})
controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    lever = Math.min(1, lever + 1)
    // console.log("lever=" + lever)
    update_status_display()
})
controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    lever = Math.max(-1, lever - 1)
    // console.log("lever=" + lever)
    update_status_display()
})
function onCrashed() {
    music.stopAllSounds()
    game.gameOver(false)
}
function getLeverSymbol(lever: number) {
    switch (lever) {
        case 1: return "^";
        case 0: return "-";
        case -1: return "v";
    }
    return "-"
}
function update_status_display() {
    // Clear the status bar
    status_bar.image.fill(0)
    // Create status text
    let text = Math.abs(trainSpeed) + "kmh " + getLeverSymbol(lever) + offset
    status_bar.image.print(text, 2, 2, status_text_color)

    right_bar.image.fill(0)
    // Create status text
    let rtext = Math.round(train.x) + ":" + Math.round(train.y) + " h=" + Math.round(headTileX) + ":" + Math.round(headTileY) + " tY=" + Math.round(targetY) + " c:" + isChangeTrack
    right_bar.image.print(rtext, 2, 2, status_text_color)

}
forever(function () {
    if (trainSpeed != targetSpeed) {
        trainSpeed += Math.sign(targetSpeed - trainSpeed)
        update_status_display()
    }
    if (offset != targetOffset) {
        offset += Math.sign(targetOffset - offset)
        //pause(10)
        update_status_display()
    }
})

function change_speed(speedOffset: number) {
    if (speedOffset == 0) {
        targetSpeed = 0
    } else {
        targetSpeed = Math.round((trainSpeed + speedOffset) / 10) * 10
        // if we stopped and then started moving again
        // we may need to change the up/down direction
        if (trainSpeed == 0) {
            if (isChangeTrack == 1 && Math.sign(prevSpeed) != Math.sign(targetSpeed)) {
                // reverse direction
                trainDirection = -trainDirection
            }
        }
    }
    if (targetSpeed > 10) {
        targetOffset = 70
    } else if (targetSpeed < -10) {
        targetOffset = -70
    } else if (targetSpeed > 0) {
        targetOffset = 50
    } else if (targetSpeed < 0) {
        targetOffset = -50
    } else {
        targetOffset = 0
    }
}
function let_passengers_in() {
    train.sayText("Mind The Gap", 2000, true)
    pause(1000)
    let platformPassengers = spriteutils.getSpritesWithin(SpriteKind.Passenger, 50, train)
    let passengerCount = 0
    for (let p of platformPassengers) {
        passengerList.removeElement(p)
        p.destroy()
        passengerCount += 1
    }
    pause(1000)
    info.changeScoreBy(passengerCount)
    //console.log("passengerCount=" + passengerCount + " passengerList.length=" + passengerList.length)
    if (passengerList.length == 0) {
        game.setGameOverMessage(true, "All Passengers Collected!")
        game.gameOver(true)
    }
}
function create_timebox() {
    let tracks = tiles.getTilesByType(assets.tile`track`)
    let timeTrackTile = tracks.get(Math.randomRange(0, tracks.length - 1))
    timeBox = sprites.create(assets.tile`timeBox`, SpriteKind.TimeBox)
    tiles.placeOnTile(timeBox, timeTrackTile)
}
function create_passengers() {
    info.startCountdown(120)
    info.onCountdownEnd(function () {
        game.setGameOverMessage(true, "Time's up!")
        game.over(true)
    })

    platforms = tiles.getTilesByType(assets.tile`platform`)
    let passengerCount = Math.randomRange(5, platforms.length)
    for (let i = 0; i < passengerCount; i++) {
        let tile = platforms.removeAt(Math.randomRange(0, platforms.length - 1))
        let passenger = sprites.create(assets.tile`man1`, SpriteKind.Passenger)
        tiles.placeOnTile(passenger, tile)
        passengerList.push(passenger)
    }
}

// TODO : decide if this is called only when direction is changing or every tick
// if we want to change the speed of the train, we shall call this every tick
// butthen targetY shall be set outside of this function
function updateDxDy() {
    let frameSpeed = trainSpeed / 60
    switch (trainDirection) {
        case Direction.Straight:
            dx = frameSpeed
            dy = 0
            break;
        case Direction.Up:
            dx = frameSpeed / Math.SQRT2  // cos(45°)
            dy = -Math.abs(frameSpeed) / Math.SQRT2 // sin(45°) upward
            break;
        case Direction.Down:
            dx = frameSpeed / Math.SQRT2
            dy = Math.abs(frameSpeed) / Math.SQRT2  // downward
            break;
    }
}

function startChangeTrack() {
    console.log("startChangeTrack targetY=" + targetY + " direction=" + trainDirection)
    if (isChangeTrack == 0) {
        isChangeTrack = 1
        prevSpeed = trainSpeed
    }
}

function targetYdistance() {
    if (trainDirection == Direction.Down) {
        return targetY - train.y;
    } else {
        return train.y - targetY;
    }
}

function updatePosition() {
    updateDxDy()
    train.x += dx
    train.y += dy
    if (isChangeTrack == 1 && targetYdistance() < 1) {
        isChangeTrack = 0
        train.setImage(assets.image`trainHead`)
        train.y = targetY
        trainDirection = Direction.Straight;
        updateDxDy()
        console.log("ENDChangeTrack targetY=" + targetY + " y=" + train.y)
    }
}

game.onUpdate(function () {
    updatePosition()
    scene.centerCameraAt(train.x + offset, train.y)
    if (isChangeTrack == 0) {
        // let frontTileX = Math.floor((train.x + Math.sign(dx) * train.width / Math.SQRT2) / 16)
        // let frontTileY = Math.floor((train.y + Math.sign(dy) * train.width / Math.SQRT2) / 16)
        let frontTileX = Math.floor((train.x) / 16)
        let frontTileY = Math.floor((train.y) / 16)
        let front = tiles.getTileLocation(frontTileX, frontTileY)
        // headTileX = Math.floor((train.x + Math.sign(dx) * train.width / 4) / 16)
        // headTileY = Math.floor((train.y + Math.sign(dy) * train.width / 4) / 16)
        headTileX = Math.floor((train.x) / 16)
        headTileY = Math.floor((train.y) / 16)
        let head = tiles.getTileLocation(headTileX, headTileY)
        //let tailTileX = Math.floor((train.x - Math.sign(trainSpeed) * train.width / 4) / 16)
        //let tail = tiles.getTileLocation(tailTileX, trainTileY)

        // console.log("ahead.col=" + ahead.column + " ahead.row=" + ahead.row)
        // train moves right
        if (train.overlapsWith(timeBox)) {
            info.changeCountdownBy(20)
            timeBox.destroy()
            create_timebox()
        }
        if (trainSpeed > 0) {
            if (tiles.tileAtLocationEquals(front, assets.tile`blockRight`)) {
                onCrashed()
            } else if (tiles.tileAtLocationEquals(head, assets.tile`forkDownRight`)) {
                if (lever < 0) {
                    targetY = targetY + trackWidth
                    trainDirection = Direction.Down
                    train.setImage(assets.image`trainHeadDown`)
                    startChangeTrack()
                    lever = 0
                }
            } else if (tiles.tileAtLocationEquals(head, assets.tile`forkUpRight`)) {
                if (lever > 0) {
                    targetY = targetY - trackWidth
                    trainDirection = Direction.Up
                    train.setImage(assets.image`trainHeadUp`)
                    startChangeTrack()
                    lever = 0
                }
            } else if (tiles.tileAtLocationEquals(head, assets.tile`turnUpRight`)) {
                targetY = targetY - trackWidth
                trainDirection = Direction.Up
                train.setImage(assets.image`trainHeadUp`)
                startChangeTrack()
                lever = 0
            } else if (tiles.tileAtLocationEquals(head, assets.tile`turnDownRight`)) {
                targetY = targetY + trackWidth
                trainDirection = Direction.Down
                train.setImage(assets.image`trainHeadDown`)
                startChangeTrack()
                lever = 0
            } else if (tiles.tileAtLocationEquals(head, assets.tile`track`) ||
                tiles.tileAtLocationEquals(head, assets.tile`forkUpLeft`) ||
                tiles.tileAtLocationEquals(head, assets.tile`forkDownLeft`) ||
                tiles.tileAtLocationEquals(head, assets.tile`turnUpLeft`) ||
                tiles.tileAtLocationEquals(head, assets.tile`turnDownLeft`)) {
                // do nothing
            } else {
                console.log("notile " + head.column + ":" + head.row)
                onCrashed()
            }
        } else if (trainSpeed < 0) {
            if (tiles.tileAtLocationEquals(front, assets.tile`blockLeft`)) {
                onCrashed()
            } else if (tiles.tileAtLocationEquals(head, assets.tile`forkDownLeft`)) {
                if (lever < 0) {
                    targetY = targetY + trackWidth
                    trainDirection = Direction.Down
                    train.setImage(assets.image`trainHeadUp`)
                    startChangeTrack()
                    lever = 0
                }
            } else if (tiles.tileAtLocationEquals(head, assets.tile`forkUpLeft`)) {
                if (lever > 0) {
                    targetY = targetY - trackWidth
                    trainDirection = Direction.Up
                    train.setImage(assets.image`trainHeadDown`)
                    startChangeTrack()
                    lever = 0
                }
            } else if (tiles.tileAtLocationEquals(head, assets.tile`turnUpLeft`)) {
                targetY = targetY - trackWidth
                trainDirection = Direction.Up
                train.setImage(assets.image`trainHeadDown`)
                startChangeTrack()
                lever = 0
            } else if (tiles.tileAtLocationEquals(head, assets.tile`turnDownLeft`)) {
                targetY = targetY + trackWidth
                trainDirection = Direction.Down
                train.setImage(assets.image`trainHeadUp`)
                startChangeTrack()
                lever = 0
            } else if (tiles.tileAtLocationEquals(head, assets.tile`track`) ||
                tiles.tileAtLocationEquals(head, assets.tile`forkUpRight`) ||
                tiles.tileAtLocationEquals(head, assets.tile`forkDownRIght`) ||
                tiles.tileAtLocationEquals(head, assets.tile`turnUpRight`) ||
                tiles.tileAtLocationEquals(head, assets.tile`turnDownRight`)) {
                trainDirection = Direction.Straight
                train.setImage(assets.image`trainHead`)
            } else {
                console.log("notile " + head.column + ":" + head.row)
                onCrashed()
            }
        }
    }
    update_status_display()
})
