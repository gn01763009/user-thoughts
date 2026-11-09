# Exit interview

You have finished your walk. Answer as yourself, from what happened to you, in the language your brief names for
thoughts and last words. Quote the page in its own language.

Say it the way you have talked all visit, the way you would really say it to a friend: your own spoken words, as
short or as long as you would really go on. The step numbers your answer rests on go in `steps`, not in what you say.

1. Did you get done what you came to do?
2. Would you come back? Why?
3. In one sentence, what would you say about this to a friend?
4. The team is thinking of launching: {{apple_pitch}}. Would you want it?
{{launch_comment_block}}
Answer from your own visit only. If a question does not fit what happened to you, say so in a few words.

## Recording your answers

Put your answers in `summary.json`, beside its other fields, in your brief's language:

- Questions 2 and 3 go in `last_words`, as the protocol describes, in the words you just said them.
- Question 4 goes in `apple`, answered as you would for any other feature:
  `{"answer":"<yes|no|unsure>","why":"<your reason, from your own visit>"}`
