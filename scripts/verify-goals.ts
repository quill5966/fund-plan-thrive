import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { eq } from "drizzle-orm"; // drizzle-orm doesn't have side effects
// Don't import services here

async function main() {
    console.log("Starting Verification...");

    // Dynamic imports to ensure env vars are loaded first
    const { advisorService } = await import("@/services/advisor");
    const { financeService } = await import("@/services/finance");
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");

    // 1. Create/Get Test User
    let userId;
    const existing = await db.select().from(users).where(eq(users.name, "Test User Goal"));
    if (existing.length) {
        userId = existing[0].id;
        console.log("Found existing test user:", userId);
    } else {
        const newUser = await db.insert(users).values({ name: "Test User Goal" }).returning();
        userId = newUser[0].id;
        console.log("Created test user:", userId);
    }

    // 2. Simulate User Voice Input
    const transcript = "I want to obtain a residency visa in a non-US country. My target is $100,000 and I have $60,000 saved. First I need to identify a target country.";
    console.log("\nSimulating Transcript:", transcript);

    const result = await advisorService.processTranscription(userId, transcript);
    console.log("\nAdvisor Result:", JSON.stringify(result, null, 2));

    if (!result.success) {
        console.error("Advisor failed!");
        process.exit(1);
    }

    // 3. Verify DB State (What the frontend would see)
    const goals = await financeService.getGoals(userId);
    console.log("\nFetch Goals Result:", JSON.stringify(goals, null, 2));

    if (goals.length === 0) {
        console.error("No goals found in DB!");
        process.exit(1);
    }

    const goal = goals[0];
    if (goal.title.includes("visa") || goal.description?.includes("visa")) {
        console.log("✅ Goal created successfully");
    } else {
        console.error("❌ Goal title/description mismatch");
    }

    if (Number(goal.targetAmount) === 100000 && Number(goal.currentAmount) === 60000) {
        console.log("✅ Financial amounts correct");
    } else {
        console.error(`❌ Amounts mismatch: Target ${goal.targetAmount}, Current ${goal.currentAmount}`);
    }

    if (goal.steps.length > 0) {
        console.log(`✅ Steps created: ${goal.steps.length}`);
        console.log("Steps:", goal.steps.map((s: any) => s.description));
    } else {
        console.error("❌ No steps created");
    }

    console.log("\nVerification Complete!");
    process.exit(0);
}

main().catch(console.error);
