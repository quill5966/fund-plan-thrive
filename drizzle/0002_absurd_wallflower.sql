CREATE TABLE "goal_step_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"description" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_step_tasks" ADD CONSTRAINT "goal_step_tasks_step_id_goal_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."goal_steps"("id") ON DELETE no action ON UPDATE no action;
