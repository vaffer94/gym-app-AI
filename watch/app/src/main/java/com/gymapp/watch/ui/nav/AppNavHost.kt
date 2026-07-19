package com.gymapp.watch.ui.nav

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.data.remote.FirebaseModule
import com.gymapp.watch.ui.home.HomeScreen
import com.gymapp.watch.ui.login.LoginScreen
import com.gymapp.watch.ui.workout.ExerciseScreen
import com.gymapp.watch.ui.workout.RestScreen
import com.gymapp.watch.ui.workout.SetupScreen
import com.gymapp.watch.ui.workout.SummaryScreen
import com.gymapp.watch.ui.workout.WorkoutViewModel

private object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val HOME = "home"
    const val SETUP = "setup"
    const val EXERCISE = "exercise"
    const val REST = "rest"
    const val SUMMARY = "summary"
}

/**
 * Un solo NavHost per tutta l'app (activity-scoped), con swipe-to-dismiss nativo Wear OS.
 * WorkoutViewModel e' condiviso tra setup/exercise/rest/summary (scope Activity via viewModel()).
 */
@Composable
fun AppNavHost() {
    val navController = rememberSwipeDismissableNavController()
    val workoutViewModel: WorkoutViewModel = viewModel()
    var selectedPlan by remember { mutableStateOf<WorkoutPlan?>(null) }

    SwipeDismissableNavHost(navController = navController, startDestination = Routes.SPLASH) {
        composable(Routes.SPLASH) {
            LaunchedEffect(Unit) {
                val target = when {
                    !FirebaseModule.isSignedIn() -> Routes.LOGIN
                    workoutViewModel.tryResumeActiveSession() != null -> Routes.EXERCISE
                    else -> Routes.HOME
                }
                navController.navigate(target) { popUpTo(Routes.SPLASH) { inclusive = true } }
            }
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        composable(Routes.LOGIN) {
            LoginScreen(
                onSignedIn = {
                    navController.navigate(Routes.HOME) { popUpTo(Routes.LOGIN) { inclusive = true } }
                },
            )
        }

        composable(Routes.HOME) {
            HomeScreen(
                onPlanSelected = { plan ->
                    selectedPlan = plan
                    navController.navigate(Routes.SETUP)
                },
            )
        }

        composable(Routes.SETUP) {
            selectedPlan?.let { plan ->
                SetupScreen(
                    plan = plan,
                    viewModel = workoutViewModel,
                    onStarted = {
                        navController.navigate(Routes.EXERCISE) { popUpTo(Routes.HOME) }
                    },
                )
            }
        }

        composable(Routes.EXERCISE) {
            ExerciseScreen(
                viewModel = workoutViewModel,
                onResting = { navController.navigate(Routes.REST) },
                onFinished = {
                    navController.navigate(Routes.SUMMARY) { popUpTo(Routes.EXERCISE) { inclusive = true } }
                },
            )
        }

        composable(Routes.REST) {
            RestScreen(
                viewModel = workoutViewModel,
                onRestDone = { navController.popBackStack() },
            )
        }

        composable(Routes.SUMMARY) {
            SummaryScreen(
                viewModel = workoutViewModel,
                onDone = {
                    selectedPlan = null
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                        launchSingleTop = true
                    }
                },
            )
        }
    }
}
