# --- Build stage -----------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/FirstTest.Api/FirstTest.Api.csproj", "src/FirstTest.Api/"]
RUN dotnet restore "src/FirstTest.Api/FirstTest.Api.csproj"

COPY . .
WORKDIR "/src/src/FirstTest.Api"
RUN dotnet publish "FirstTest.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# --- Runtime stage ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FirstTest.Api.dll"]
