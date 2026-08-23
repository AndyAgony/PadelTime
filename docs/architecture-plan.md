# Padel App Architecture Plan

The cleanest way to think about this is **not as an "Americano app."** Build it as a **racquet-sports session engine** where Americano is simply the first game format.

That distinction matters because if you architect it properly, later you can support Mexicano, King of the Court, fixed-team tournaments, round robins, leagues, ladders, and other formats without rebuilding the product.

## 1. The Three Core Experiences

You already identified the right three:

- Player view for signup, check-in, match assignments, scoring, and standings
- Organizer/master view for running a live game session
- Backend admin for settings, configuration, and game format management

## 2. Player Experience

The player should barely feel like they're using software.

Their flow should be:

```text
Invite/link
  -> Join game
  -> Check in
  -> See next match
  -> Enter/confirm score
  -> See standings
  -> Repeat
```

A player's home screen during an active session should answer only four questions:

**Where am I playing?**  
Court 2.

**Who am I playing with?**  
George.

**Who are we playing?**  
John + Zach.

**What's happening next?**  
Round 3 starts in 4 minutes.

The active-game view could look like this:

```text
SUNDAY PADEL
Round 2 of 5

COURT 2

Andrew + George
      VS
John + Zach

24 POINT ROUND

Current score:
12 - 8

[ + Andrew/George ]
[ + John/Zach ]

20 / 24 points played

Next:
Round 3 pairings generated after all courts finish
```

For scoring, ideally **any of the four players can enter the score**, but someone from the opposing team confirms it.

Example:

```text
Andrew submits 14-10
Zach taps Confirm
```

Then that score becomes official.

You don't necessarily need live rally-by-rally scoring for MVP. Players could simply enter **14-10** when they're finished.

## 3. Organizer / Master View

This is the command center.

This is what the organizer uses to run 15 people across three courts.

The organizer dashboard should show the entire event at once:

```text
SUNDAY PADEL
15 Players | 3 Courts | 90 Minutes

ROUND 2 / 5

COURT 1
Ben + Mike
vs
David + Chris
14-10   COMPLETE

COURT 2
Andrew + George
vs
John + Zach
12-8    LIVE

COURT 3
Adam + Sam
vs
Ryan + Josh
9-11    LIVE

BYE THIS ROUND
Daniel
Eric
Matt
```

Organizer controls should include:

- Start round
- End round
- Edit score
- Move player
- Replace player
- Force generate next round
- Undo previous round
- Pause session

The organizer should also see warnings:

```text
Warning: George has partnered Andrew twice already.
Warning: Daniel has had two byes; everyone else has had one.
Warning: Court 3 score hasn't been submitted.
```

That becomes very valuable once the scheduling engine gets complicated.

## 4. Backend Admin

This is different from an event organizer.

An organizer controls **one game/session**.

Admin controls **how the platform works**.

Admin areas should include:

- Game formats
- Platform defaults
- Scoring formats
- User/group permissions
- Configuration rules
- Audit logs
- Feature flags or enabled modules

### Game Formats

Initial formats could include:

- Americano
- Mexicano
- King of Court
- Round Robin
- Fixed Pairs
- Custom

Each format should not be hard-coded into the UI. Instead, each format should be a collection of rules.

For example:

```text
AMERICANO

Team Type:
Rotating partners

Scoring:
Fixed total points

Default Points:
24

Ranking:
Individual cumulative points

Pairing Logic:
Maximum partner diversity

Opponent Logic:
Maximum opponent diversity

Court Assignment:
Random / balanced

Bye Handling:
Rotate evenly

Ties:
Allowed
```

Mexicano might instead say:

```text
Pairing Logic:
Based on current leaderboard

Grouping:
Players 1-4
Players 5-8
Players 9-12
etc.
```

That is the recommended architecture.

## 5. The Game Format Engine

This is probably the most important technical concept in the whole application.

You want one **session engine** and multiple **format strategies**.

Conceptually:

```text
SESSION ENGINE
       |
       |-- Americano rules
       |-- Mexicano rules
       |-- King of Court rules
       |-- Custom format rules
```

Every game format should answer the same questions:

- How many players can participate?
- How are teams created?
- How are courts assigned?
- How is a match scored?
- How are standings calculated?
- What happens after a round?
- How are byes handled?
- How are ties handled?
- When does the event end?

Then the engine generates the next round accordingly.

This prevents you from ending up with:

```text
americano.js
mexicano.js
americano15players.js
americano12players.js
mexicanoByes.js
kingCourtSpecial.js
```

That kind of structure becomes a nightmare.

## 6. Core Data Model

At a high level, structure the underlying data around these objects.

```text
USER
  Player profile
    - Name
    - Skill/rating
    - History
    - Stats

GROUP
  Sunday Padel Crew
    - Members
    - Organizers
    - Default settings

SESSION
  - Date/time
  - Venue
  - Courts
  - Duration
  - Format
  - Players
  - Status

ROUND
  - Round number
  - Start/end
  - Matches

MATCH
  - Court
  - Team A
  - Team B
  - Score
  - Status

PLAYER RESULT
  - Player
  - Match
  - Partner
  - Opponents
  - Points scored
  - Points against
  - Win/loss
  - Ranking points
```

That last table is extremely important.

Do not merely store:

```text
Andrew + George beat John + Zach 14-10.
```

Also store:

```text
Andrew
Points: 14
Against: 10
Partner: George

George
Points: 14
Against: 10
Partner: Andrew

John
Points: 10
Against: 14
Partner: Zach

Zach
Points: 10
Against: 14
Partner: John
```

That makes future analytics and scheduling dramatically easier.

## 7. Session Lifecycle

Think of a session as a state machine.

```text
DRAFT
  |
  v
OPEN FOR REGISTRATION
  |
  v
REGISTRATION CLOSED
  |
  v
CHECK-IN
  |
  v
READY
  |
  v
ROUND 1
  |
  v
ROUND 2
  |
  v
ROUND 3
  |
  v
...
  |
  v
COMPLETE
```

The software should know exactly what actions are allowed at every stage.

For example, once Round 3 has started, someone should not casually remove a Round 1 player and corrupt the tournament.

## 8. Registration

This becomes a much bigger product feature than it initially sounds.

Organizer creates:

```text
Sunday Padel
Aug 30
7:30-9 PM
3 courts
Max 15 players
```

Then sends a link into WhatsApp.

Players tap:

```text
JOIN
```

Now the app handles:

```text
12 confirmed
3 spaces remaining
2 waitlisted
```

If someone drops:

```text
Matt cancelled.
Daniel moved from waitlist -> confirmed.
```

Potentially send the moved player a push, SMS, or WhatsApp notification later.

## 9. Check-In Matters

There should be a difference between:

- Registered
- Actually standing at the padel club

Five minutes before the game:

```text
Checked in:
- Andrew
- George
- John
- Zach
- Mike

Missing:
- Ryan
- Eric
```

Organizer taps:

```text
Close Check-in
```

Now the game engine schedules only the people who actually showed up.

Otherwise one late player can destroy the Round 1 schedule.

## 10. Byes / Alternates

This needs to be a first-class concept in the software.

Do not treat a bye like a weird edge case.

For 15 players / 12 court slots:

```text
ROUND 1
3 players BYE

ROUND 2
3 different players BYE

ROUND 3
3 different players BYE
```

Your scheduler should optimize for:

- Fewest total byes
- Longest time since previous bye
- Nobody gets consecutive byes unless unavoidable

And probably:

- Do not give someone a bye immediately after they just arrived late

You will eventually find lots of small rules like that.

## 11. The Pairing Algorithm

Your scheduler ultimately becomes the secret sauce.

For Americano, give every possible pairing a score.

Something conceptually like:

```text
Preferred:
+ never partnered before
+ haven't recently opposed each other
+ similar number of matches played
+ similar number of byes

Avoid:
- repeat partner
- repeat opponents
- consecutive bye
```

Then generate the combination with the lowest penalty.

Later, Mexicano adds:

```text
+ similar current ranking
```

King of Court adds:

```text
+ current court position
```

Same engine, different constraints.

## 12. Skill Ratings

Build support for this in the database now, even if you do not expose it in Version 1.

A player could eventually have:

```text
Padel Rating: 3.4
```

Then you can do some interesting things.

For the first Americano round:

```text
Seed players approximately by skill.
```

Afterward:

```text
Let game performance drive the event.
```

You could eventually calculate your own internal rating from hundreds of games.

Now your application starts becoming more than a scheduler.

## 13. Leaderboards

There are really two types.

### Session Leaderboard

Tonight:

```text
1. Andrew      87
2. George      84
3. Zach        79
...
```

### Group Leaderboard

Across the entire season:

```text
Sunday Padel

Games Played
Points
Wins
Podiums
Average Finish
Win %
Partner Win %
```

Eventually:

- Most common partner
- Best partnership
- Nemesis
- Head-to-head

That kind of history makes people come back to the app.

## 14. Score Integrity

You need to decide who has authority.

Recommended flow:

```text
Player submits
     |
     v
Opponent confirms
     |
     v
Score locked
```

If there is a disagreement:

```text
Dispute score
```

Organizer receives:

```text
Court 2 score disputed.
```

Organizer makes the final decision.

Every admin edit should be logged:

```text
14-10 changed to 13-11
by Andrew
8:46 PM
```

An audit trail saves a lot of headaches.

## 15. Real-Time Synchronization

Technically, everyone should be looking at the **same session state**.

```text
                SERVER
                  |
        ----------+----------
        |         |         |
     Andrew    George    Organizer
      phone     phone      iPad
```

Andrew submits:

```text
14-10
```

Immediately:

- George sees 14-10
- Organizer sees Court 2 complete
- Leaderboard recalculates
- Once all courts finish, Round 3 is generated
- Everyone receives their next assignment simultaneously

This is where real-time technologies like WebSockets or real-time databases become useful.

## 16. Court Display Mode

Add a fourth UI that is not really a user role.

### TV / Court Display

Put an iPad or television at the facility.

```text
ROUND 3

COURT 1
Andrew + John
vs
George + Zach

COURT 2
...

COURT 3
...

SITTING
Mike | Ryan | Eric

NEXT ROUND
Waiting for Court 2
```

Everyone stops asking:

```text
Who am I playing?
```

That will be extremely useful.

## 17. Organizer Controls Need Overrides

Algorithms are great until:

```text
Zach twisted his ankle.
```

So the organizer needs:

```text
Remove player
```

Then the software asks:

```text
Replace with waitlisted player?
```

or:

```text
Recalculate remaining rounds?
```

Similarly:

```text
George has to leave at 8:30.
```

Mark him:

```text
Leaving after Round 3.
```

The scheduler adjusts.

Human override needs to always exist.

## 18. Recurring Groups

This use case is not really isolated tournaments.

It is more like:

```text
Andrew's Sunday Padel Group
```

So make **Groups** central.

```text
SUNDAY PADEL

26 members

Upcoming
Aug 30 - 13 / 15 joined

Past
Aug 23 - Andrew winner
Aug 16 - George winner
Aug 9 - Zach winner
```

Then starting the next game takes 20 seconds.

## 19. Notifications

Eventually:

### Game Invitation

```text
Padel Sunday 7:30 PM - Join?
```

### You're Off the Waitlist

```text
You are now confirmed for Sunday Padel.
```

### Game Starts Soon

```text
Game starts in 2 hours.
```

### Round Ready

```text
Round 3 ready.
Court 1
Partner: George
```

### Final Standings

```text
Andrew
82 points
```

Do not overdo notifications.

## 20. Configuration Model

Admin/organizer settings should probably be hierarchical:

```text
PLATFORM DEFAULT
       |
       v
GAME FORMAT DEFAULT
       |
       v
GROUP DEFAULT
       |
       v
SESSION OVERRIDE
```

For example:

Platform says:

```text
Americano default = 24 points.
```

Your Sunday group says:

```text
We always play 32.
```

Tonight you say:

```text
We only have 60 minutes, so use 16 points.
```

That session overrides everything.

## 21. One Critical Feature You're Missing: Simulation

Before starting the game:

```text
Preview Tournament
```

The system should show:

```text
15 players
3 courts
5 rounds

Each player:
4 matches
1 bye

Partners:
0 repeat pairings

Estimated duration:
87 minutes
```

Organizer can approve before pressing:

```text
START
```

That is extremely useful.

## 22. Scoring Format Is Not the Same as Tournament Format

Keep these separate.

Tournament format:

```text
Americano
```

Scoring format:

```text
24 rally points
```

Because later someone may want:

- Americano + timed games
- Americano + traditional scoring
- Americano + first to 15
- Mexicano + 24 points
- Mexicano + 15-minute rounds

Architect them independently.

## 23. MVP I Would Actually Build

Do not build the monster app first.

### Version 1

Build only:

- Groups
- Create session
- Invite players
- Join / waitlist
- Check in
- Americano
- 12-15 player support
- 3 courts
- Automatic pairings
- Byes
- Score submission
- Live standings
- Organizer dashboard
- Session results

That is enough to use it with a real group every Sunday.

### Version 2

Then add:

- Mexicano
- King's Court
- Custom rules
- Player ratings
- Recurring games
- Notifications
- TV mode
- Historical stats

### Version 3

Then it could become an actual commercial product:

- Club accounts
- Multiple organizers
- Court reservation integration
- Payments
- Leagues
- Public/open games
- Player discovery
- Club rankings

## 24. Conceptual Architecture

Ultimately, build the product around this:

```text
                    GROUP
                      |
                      v
                   SESSION
                      |
             ---------+---------
             |                 |
          PLAYERS          GAME FORMAT
             |                 |
             |         --------+---------
             |         |       |        |
             |      Americano Mexicano King
             |
             v
         SCHEDULER
             |
             v
           ROUND
             |
        -----+-----
        v    v    v
      Court Court Court
        1     2     3
        |
        v
      MATCH
        |
        v
      SCORE
        |
        v
   PLAYER RESULTS
        |
        v
    LEADERBOARD
        |
        +------------> NEXT ROUND
```

That loop is the heart of the entire application:

```text
schedule -> play -> score -> rank -> generate next round
```

And there is one product principle to stick to:

> **The organizer gets complexity. The player gets simplicity.**

You may have a sophisticated scheduling engine underneath, but George should open his phone and see:

```text
You're on Court 2 with Andrew.
```

That's it.
