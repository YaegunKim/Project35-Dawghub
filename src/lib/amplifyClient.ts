import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import outputs from '../../amplify_outputs.json'

// FriendsDrawer is a static (non-lazy) import reachable from main.tsx via
// App -> AppShell -> FriendsDrawer -> this module, so this module can evaluate
// before main.tsx reaches its own Amplify.configure(outputs) call — ES module
// imports are evaluated before the importing module's own top-level statements,
// regardless of where those statements appear in the file. Configuring here too
// (idempotent, safe to call more than once) makes this module correct regardless
// of which pages happen to be lazy vs. eagerly imported elsewhere in the app.
Amplify.configure(outputs)

export const client = generateClient<Schema>()
