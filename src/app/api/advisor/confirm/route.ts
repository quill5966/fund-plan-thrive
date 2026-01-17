import { NextRequest, NextResponse } from "next/server";
import { financeService } from "@/services/finance";

/**
 * POST /api/advisor/confirm
 * 
 * Handles user confirmation when the LLM returns a low-confidence
 * asset/debt identification. The user can either:
 * - Merge with an existing account (choice: "merge")
 * - Create as a new account (choice: "new")
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            userId,
            confirmationType,  // "asset" | "debt"
            choice,            // "merge" | "new"
            existingAccountName,  // Required if choice === "merge"
            pendingAction      // { type, name, amount, effectiveDate }
        } = body;

        // Validate required fields
        if (!userId || !confirmationType || !choice || !pendingAction) {
            return NextResponse.json(
                { error: "Missing required fields: userId, confirmationType, choice, pendingAction" },
                { status: 400 }
            );
        }

        const { type, name, amount, effectiveDate } = pendingAction;
        const date = effectiveDate ? new Date(effectiveDate) : new Date();

        if (confirmationType === "asset") {
            if (choice === "merge" && existingAccountName) {
                // User confirmed this is the same as an existing account - merge them
                await financeService.mergeAsset(userId, existingAccountName, name, type, amount, date);
                return NextResponse.json({
                    success: true,
                    action: "merged",
                    message: `Merged "${name}" with existing account "${existingAccountName}"`
                });
            } else {
                // User confirmed this is a new account - create it
                await financeService.upsertAsset(userId, type, name, amount, date, "user_input", true);
                return NextResponse.json({
                    success: true,
                    action: "created",
                    message: `Created new asset "${name}"`
                });
            }
        } else if (confirmationType === "debt") {
            if (choice === "merge" && existingAccountName) {
                await financeService.mergeDebt(userId, existingAccountName, name, type, amount, date);
                return NextResponse.json({
                    success: true,
                    action: "merged",
                    message: `Merged "${name}" with existing debt "${existingAccountName}"`
                });
            } else {
                await financeService.upsertDebt(userId, type, name, amount, date, "user_input", true);
                return NextResponse.json({
                    success: true,
                    action: "created",
                    message: `Created new debt "${name}"`
                });
            }
        } else {
            return NextResponse.json(
                { error: "Invalid confirmationType. Must be 'asset' or 'debt'" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error in /api/advisor/confirm:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process confirmation" },
            { status: 500 }
        );
    }
}
