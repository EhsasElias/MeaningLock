# MeaningLock

### Real-time voice agreement verification powered by AssemblyAI

> Most voice agents listen to one person. MeaningLock listens to both sides of an agreement.

MeaningLock is a real-time **agreement firewall** that listens to two people, extracts the terms each person believes they agreed to, detects contradictions before commitment, requests clarification, and produces a verified agreement only after both parties align and confirm.

Built for the **AssemblyAI Voice Agent Hackathon**.

## 🔗 Live Demo

**https://meaninglock-production-95bb.up.railway.app**

## 💻 GitHub

**https://github.com/EhsasElias/MeaningLock**

---

## The Problem

Business agreements often happen through conversations before they become formal contracts.

A supplier might say:

> Deliver 50 units for $15,000 on October 10th. Installation is not included.

While the other party believes:

> We agree on 50 units for $50,000 on October 10th. Installation is included.

Both people may leave the conversation believing they agreed — even though the price and scope are completely different.

These misunderstandings can become:

- disputes
- payment conflicts
- incorrect deliveries
- contract problems
- lost time
- lost money

MeaningLock catches these differences **before the agreement is finalized**.

---

## How MeaningLock Works

```text
Speaker A
    ↓
Voice
    ↓
AssemblyAI Streaming Speech-to-Text
    ↓
MeaningLock extracts terms
    ↓

Speaker B
    ↓
Voice
    ↓
AssemblyAI Streaming Speech-to-Text
    ↓
MeaningLock extracts terms
    ↓

Compare both parties
    ↓
Conflict detected?
    ↓
Yes → Ask for clarification
    ↓
Terms corrected
    ↓
Both sides aligned
    ↓
Speaker A confirms
Speaker B confirms
    ↓
Verified Agreement
